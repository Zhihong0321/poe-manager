import axios from 'axios';
import dotenv from 'dotenv';
import { statusBus } from './status_bus.js';

dotenv.config();

const USER_AGENT = 'PoE2TradeManager/1.0';
const RATE_LIMIT_PENALTY_MS = 60000; // 60s Default Penalty

// Global IP-level cooldown to prevent spamming even with multiple cookies
let globalNextRequestAt = 0;
const GLOBAL_MIN_DELAY = 1500; // Minimum 1.5s between ANY request to PoE

// Global map to track when each session can be used next
const sessionCooldowns = new Map<string, number>();

// Helper to create client for a specific session
const createClient = (sessId: string) => {
    return axios.create({
        baseURL: 'https://www.pathofexile.com', 
        headers: {
            'Cookie': `POESESSID=${sessId}`,
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
};

/**
 * Parses PoE's rate limit state headers to adjust cooldowns dynamically.
 * Header format: "requests:window:penalty,..."
 */
function updateCooldowns(sessId: string, headers: any) {
    const accountState = headers['x-rate-limit-account-state'];
    const ipState = headers['x-rate-limit-ip-state'];
    const accountLimit = headers['x-rate-limit-account'];
    
    // If we see we are near the limit, we increase the wait time
    // For now, we'll use a conservative approach: if any rule is hit or near hit, we wait.
    
    // Also respect Retry-After if present
    const retryAfter = headers['retry-after'];
    if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        const penalty = (seconds + 2) * 1000; // Add 2s buffer
        console.log(`[RateLimit] Retry-After detected: ${seconds}s. Penalizing sessions.`);
        sessionCooldowns.set(sessId, Date.now() + penalty);
        globalNextRequestAt = Date.now() + penalty;
    }
}

/**
 * Finds a ready session or waits until one is available.
 */
async function getNextAvailableSession(sessIds: string[]): Promise<string> {
    if (sessIds.length === 0) throw new Error("No session IDs provided.");

    while (true) {
        const now = Date.now();
        
        // 1. Check Global IP limit first
        if (now < globalNextRequestAt) {
            const waitTime = globalNextRequestAt - now;
            await new Promise(r => setTimeout(r, waitTime));
            continue;
        }

        let earliestReadyTime = Infinity;
        let readySession: string | null = null;

        // 2. Find a ready session
        for (const id of sessIds) {
            const readyAt = sessionCooldowns.get(id) || 0;
            if (now >= readyAt) {
                readySession = id;
                break;
            }
            if (readyAt < earliestReadyTime) earliestReadyTime = readyAt;
        }

        if (readySession) {
            // Set a base cooldown (Search is expensive, Fetch is cheaper)
            // We'll use 5s as a safe baseline for Search, and the caller can adjust if needed
            sessionCooldowns.set(readySession, now + 5000); 
            globalNextRequestAt = now + GLOBAL_MIN_DELAY;
            return readySession;
        }

        const waitTime = earliestReadyTime - now;
        if (waitTime > 0) {
            statusBus.log(`Waiting ${Math.ceil(waitTime/1000)}s for cookie cooldown...`, 'wait');
            await new Promise(r => setTimeout(r, Math.min(waitTime, 1000)));
        } else {
             await new Promise(r => setTimeout(r, 500));
        }
    }
}

/**
 * Executes a request using rotation and header-based rate limiting.
 */
async function requestWithRotation(
    sessIds: string[], 
    method: 'get' | 'post', 
    url: string, 
    data?: any,
    baseCooldown: number = 5000
): Promise<any> {
    let attempts = 0;
    const maxAttempts = sessIds.length * 2;

    while (attempts < maxAttempts) {
        const sessId = await getNextAvailableSession(sessIds);
        // Re-set cooldown based on request type
        sessionCooldowns.set(sessId, Date.now() + baseCooldown);
        
        const client = createClient(sessId);

        try {
            statusBus.log(`API Request: ${url.split('?')[0]}`, 'info');
            let response;
            if (method === 'get') {
                response = await client.get(url);
            }
            else {
                response = await client.post(url, data);
            }
            
            updateCooldowns(sessId, response.headers);
            statusBus.log(`API Success`, 'success');
            return response;
        } catch (error: any) {
            const status = error.response?.status;
            const headers = error.response?.headers || {};
            
            if (status === 429) {
                statusBus.log(`Rate Limited (429)! Parsing headers...`, 'error');
                updateCooldowns(sessId, headers);
                // If no specific retry-after, apply default penalty
                if (!headers['retry-after']) {
                    sessionCooldowns.set(sessId, Date.now() + RATE_LIMIT_PENALTY_MS);
                }
            } else if (status === 403 || status === 401) {
                statusBus.log(`Auth Error (${status}).`, 'error');
                sessionCooldowns.set(sessId, Date.now() + 3600000); 
            } else {
                statusBus.log(`Error ${status}. Retrying...`, 'error');
                sessionCooldowns.set(sessId, Date.now() + 10000); // 10s wait on error
            }
            
            attempts++;
            if (attempts >= maxAttempts) throw error;
        }
    }
    throw new Error("Max attempts reached.");
}


export async function getStashTabsByPrice(accountName: string, league: string, sessIds: string[], currency: string, min?: number, max?: number) {
    try {
        const encodedLeague = encodeURIComponent(league);
        const url = `/api/trade2/search/${encodedLeague}`;
        
        let priceFilter: any = { option: currency };
        if (min !== undefined) priceFilter.min = min;
        if (max !== undefined) priceFilter.max = max;

        let baseQuery: any = {
            query: {
                status: { option: "any" },
                filters: {
                    trade_filters: {
                        filters: {
                            account: { input: accountName },
                            price: priceFilter
                        }
                    }
                }
            }
        };

        const fetchIds = (query: any) => requestWithRotation(sessIds, 'post', url, query).then(res => res.data);

        console.log(`[PriceScan] Fetching ${currency} (${min}-${max}) for ${accountName}...`);

        const [dataAsc, dataDesc] = await Promise.all([
            fetchIds({ ...baseQuery, sort: { price: "asc" } }).catch(e => ({ result: [] })),
            fetchIds({ ...baseQuery, sort: { price: "desc" } }).catch(e => ({ result: [] }))
        ]);

        const ids = new Set<string>();
        let total = 0;

        if (dataAsc?.result) dataAsc.result.forEach((id: string) => ids.add(id));
        if (dataDesc?.result) dataDesc.result.forEach((id: string) => ids.add(id));
        if (dataAsc?.total > total) total = dataAsc.total;

        return { ids: Array.from(ids), total };
    } catch (error: any) {
        console.error("Error in Price Group search:", error.message);
        throw error;
    }
}

export async function getStashTabs(accountName: string, league: string, sessIds: string[]) {
    try {
        const encodedLeague = encodeURIComponent(league);
        const url = `/api/trade2/search/${encodedLeague}`;
        console.log(`Searching for seller items: ${url}`);
        console.log(`Using Account: ${accountName} with ${sessIds.length} sessions (Round-Robin 5s)`);
        
        let baseQuery: any = {
            query: {
                status: { option: "any" },
                filters: {
                    trade_filters: {
                        filters: {
                            account: { input: accountName }
                        }
                    }
                }
            }
        };

        const queryAsc = { ...baseQuery, sort: { price: "asc" } };
        const queryDesc = { ...baseQuery, sort: { price: "desc" } };
        const queryNew = { ...baseQuery, sort: { indexed: "desc" } };

        console.log(`[Scan] Fetching items for ${accountName} (Price Asc/Desc + Newest)...`);

        const fetchIds = (query: any) => requestWithRotation(sessIds, 'post', url, query, 6000).then(res => res.data);

        // Execute base queries sequentially to avoid IP-level burst limits
        const dataAsc = await fetchIds(queryAsc);
        const dataDesc = await fetchIds(queryDesc);
        const dataNew = await fetchIds(queryNew);

        const ids = new Set<string>();
        let totalOnServer = 0;

        const processData = (data: any, label: string = 'base') => {
            if (data && data.result) {
                data.result.forEach((id: string) => ids.add(id));
                if (data.total > totalOnServer) totalOnServer = data.total;
            }
        };

        processData(dataAsc);
        processData(dataDesc);
        processData(dataNew);

        const categoryStats: Record<string, number> = {};

        // Check for truncation
        if (ids.size < totalOnServer) {
            console.log(`[Scan] Truncation detected (Found ${ids.size} / ${totalOnServer}). initiating Deep Scan by Category...`);
            
            // Expanded categories for more granular discovery
            const categories = [
                'weapon', 'armour', 'accessory', 'jewel', 'card', 'gem', 'flask', 'map', 'currency'
            ];
            
            for (const cat of categories) {
                const catQuery = JSON.parse(JSON.stringify(baseQuery));
                if (!catQuery.query.filters.type_filters) catQuery.query.filters.type_filters = {};
                if (!catQuery.query.filters.type_filters.filters) catQuery.query.filters.type_filters.filters = {};
                catQuery.query.filters.type_filters.filters.category = { option: cat };
                
                const qAsc = { ...catQuery, sort: { price: "asc" } };
                const qDesc = { ...catQuery, sort: { price: "desc" } };

                try {
                    const [d1, d2] = await Promise.all([
                        fetchIds(qAsc).catch(e => ({ result: [] })), 
                        fetchIds(qDesc).catch(e => ({ result: [] }))
                    ]);
                    
                    const catIds = new Set<string>();
                    if (d1?.result) d1.result.forEach((id: string) => catIds.add(id));
                    if (d2?.result) d2.result.forEach((id: string) => catIds.add(id));
                    
                    categoryStats[cat] = catIds.size;

                    if (catIds.size > 0) {
                        console.log(`[Scan] Category ${cat}: found ${catIds.size} items.`);
                        catIds.forEach(id => ids.add(id));
                    }
                } catch (err: any) {
                    console.error(`[Scan] Error scanning category ${cat}:`, err.message);
                }
            }
        }

        const combinedIds = Array.from(ids);
        console.log(`Found ${combinedIds.length} unique items (Server Total: ${totalOnServer})`);

        return { ids: combinedIds, total: totalOnServer, categoryStats };

        if (combinedIds.length === 0 && totalOnServer === 0) {
             if (!accountName.includes('#')) {
                 console.log(`No items found for ${accountName}. Ensure the profile has the correct account name.`);
             }
        }

        return { ids: combinedIds, total: totalOnServer };

    } catch (error: any) {
        // CRITICAL: Propagate error so scanner knows it failed.
        console.error("Error in search API (All attempts failed):", error.message);
        throw error; 
    }
}

// Generic Market Search (for trends/analysis)
export async function searchTrade(league: string, query: any, sessIds: string[]) {
    try {
        const encodedLeague = encodeURIComponent(league);
        const url = `/api/trade2/search/${encodedLeague}`;
        console.log(`Market Search: ${url}`);
        
        const response = await requestWithRotation(sessIds, 'post', url, query);
        
        if (response.data && response.data.result) {
            return {
                id: response.data.id, 
                total: response.data.total, 
                result: response.data.result
            };
        }
        return null;
    } catch (error: any) {
        console.error("Error in Market Search:", error.response?.status, error.response?.data || error.message);
        return null;
    }
}

export async function fetchItemDetails(itemIds: string[], sessIds: string[]) {

    if (itemIds.length === 0) return [];

    

    // Safety: don't try to fetch more than 500 items in one go

    const idsToFetch = itemIds.slice(0, 500);

    if (itemIds.length > 500) {

        statusBus.log(`Large stash detected! Limiting fetch to 500 items.`, 'error');

    }



    const chunks = [];

    for (let i = 0; i < idsToFetch.length; i += 10) {

        chunks.push(idsToFetch.slice(i, i + 10));

    }



    let allItems: any[] = [];

    

            // Fetch chunks sequentially to be nice to the API

    

            for (let i = 0; i < chunks.length; i++) {

    

                const chunk = chunks[i]!;

    

                statusBus.log(`Fetching items ${i*10 + 1} to ${Math.min((i+1)*10, idsToFetch.length)}...`, 'info');

    

        

    

    

        

        try {

            const url = `/api/trade2/fetch/${chunk.join(',')}?id=placeholder`; 

            // Fetch API is usually more lenient, 2s is safe

            const response = await requestWithRotation(sessIds, 'get', url, null, 2000);



            if (response.data && response.data.result) {

                allItems = allItems.concat(response.data.result);

            }

        } catch (error: any) {

            statusBus.log(`Failed to fetch chunk. Continuing...`, 'error');

        }

    }

    

    return allItems;

}
