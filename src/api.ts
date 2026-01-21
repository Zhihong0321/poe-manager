import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const USER_AGENT = 'PoE2TradeManager/1.0';
const COOLDOWN_MS = 5000; // 5 Seconds Hard Limit per Cookie
const RATE_LIMIT_PENALTY_MS = 60000; // 60s Penalty if we hit 429

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
 * Finds a ready session or waits until one is available.
 * Returns the session ID to use.
 */
async function getNextAvailableSession(sessIds: string[]): Promise<string> {
    if (sessIds.length === 0) throw new Error("No session IDs provided.");

    while (true) {
        const now = Date.now();
        let earliestReadyTime = Infinity;
        let readySession: string | null = null;

        // 1. Try to find a ready session
        for (const id of sessIds) {
            const readyAt = sessionCooldowns.get(id) || 0;
            if (now >= readyAt) {
                readySession = id;
                break; // Found one!
            }
            if (readyAt < earliestReadyTime) {
                earliestReadyTime = readyAt;
            }
        }

        // 2. If found, mark it used and return
        if (readySession) {
            sessionCooldowns.set(readySession, now + COOLDOWN_MS);
            return readySession;
        }

        // 3. If none ready, wait
        const waitTime = earliestReadyTime - now;
        if (waitTime > 0) {
            // console.log(`[RateLimit] All sessions on cooldown. Waiting ${Math.ceil(waitTime/1000)}s...`);
            await new Promise(r => setTimeout(r, Math.min(waitTime, 1000))); // Check every 1s or exact time
        } else {
             // Should not happen if logic is correct, but safe fallback
             await new Promise(r => setTimeout(r, 500));
        }
    }
}

/**
 * Executes a request using the session rotation logic.
 * Handles 429s by penalizing the session and retrying with another.
 */
async function requestWithRotation(
    sessIds: string[], 
    method: 'get' | 'post', 
    url: string, 
    data?: any
): Promise<any> {
    let attempts = 0;
    const maxAttempts = sessIds.length * 3; // Try a few times per session effectively

    while (attempts < maxAttempts) {
        const sessId = await getNextAvailableSession(sessIds);
        const client = createClient(sessId);

        try {
            if (method === 'get') {
                return await client.get(url);
            } else {
                return await client.post(url, data);
            }
        } catch (error: any) {
            const status = error.response?.status;
            
            if (status === 429) {
                console.warn(`[API] Rate Limit (429) on session ...${sessId.slice(-4)}. Penalizing 60s.`);
                sessionCooldowns.set(sessId, Date.now() + RATE_LIMIT_PENALTY_MS);
            } else if (status === 403 || status === 401) {
                console.warn(`[API] Auth/Forbidden (${status}) on session ...${sessId.slice(-4)}. Skipping for this run.`);
                // Effectively remove from rotation for a long time or until restart
                sessionCooldowns.set(sessId, Date.now() + 3600000); 
            } else {
                // Other errors (500, network) -> Throw or Retry?
                // For "Sold" detection safety, we treat network errors as fatal for this request usually,
                // but here we might want to try another session just in case it's a specific route issue?
                // Let's retry with another session just to be safe.
                console.warn(`[API] Error ${status} on session ...${sessId.slice(-4)}. Retrying...`);
            }
            
            attempts++;
            // If we exhausted all attempts, throw
            if (attempts >= maxAttempts) throw error;
        }
    }
    throw new Error("Max retry attempts reached.");
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

        // Execute requests in parallel. 
        // requestWithRotation will manage the waiting/queueing internally to respect 5s limit.
        
        const fetchIds = (query: any) => requestWithRotation(sessIds, 'post', url, query).then(res => res.data);

        const [dataAsc, dataDesc, dataNew] = await Promise.all([
            fetchIds(queryAsc).catch(e => { console.error("Asc Query Failed", e.message); throw e; }),
            fetchIds(queryDesc).catch(e => { console.error("Desc Query Failed", e.message); throw e; }),
            fetchIds(queryNew).catch(e => { console.error("New Query Failed", e.message); throw e; })
        ]);

        const ids = new Set<string>();
        let totalOnServer = 0;

        const processData = (data: any) => {
            if (data && data.result) {
                data.result.forEach((id: string) => ids.add(id));
                if (data.total > totalOnServer) totalOnServer = data.total;
            }
        };

        processData(dataAsc);
        processData(dataDesc);
        processData(dataNew);

        // Check for truncation
        if (ids.size < totalOnServer) {
            console.log(`[Scan] Truncation detected (Found ${ids.size} / ${totalOnServer}). initiating Deep Scan by Category...`);
            
            // Expanded categories for more granular discovery
            const categories = [
                'weapon', 'weapon.one', 'weapon.onehand', 'weapon.twohand', 'weapon.bow', 'weapon.claw', 'weapon.dagger', 'weapon.runedagger', 'weapon.oneaxe', 'weapon.twoaxe', 'weapon.onemace', 'weapon.twomace', 'weapon.onesword', 'weapon.twosword', 'weapon.sceptre', 'weapon.staff', 'weapon.warstaff', 'weapon.wand', 'weapon.rod',
                'armour', 'armour.chest', 'armour.boots', 'armour.gloves', 'armour.helmet', 'armour.shield', 'armour.quiver',
                'accessory', 'accessory.amulet', 'accessory.belt', 'accessory.ring',
                'jewel', 'card', 'gem', 'flask', 'map', 'currency', 'heistequipment', 'heistmission', 'logbook', 'sentinel', 'memory'
            ];
            
            // We can run categories in parallel too because our Rate Limiter handles the queue!
            // But let's limit concurrency slightly to avoid jamming the queue too much.
            
            const categoryPromises = categories.map(async (cat) => {
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
                    
                    if (catIds.size > 0) {
                        console.log(`[Scan] Category ${cat}: found ${catIds.size} items.`);
                        return Array.from(catIds);
                    }
                } catch (err: any) {
                    console.error(`[Scan] Error scanning category ${cat}:`, err.message);
                }
                return [];
            });

            const catResults = await Promise.all(categoryPromises);
            catResults.flat().forEach(id => ids.add(id));
        }

        const combinedIds = Array.from(ids);
        console.log(`Found ${combinedIds.length} unique items (Server Total: ${totalOnServer})`);

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
    
    // Trade API fetch limit is usually 10 items per call
    const chunks = [];
    for (let i = 0; i < itemIds.length; i += 10) {
        chunks.push(itemIds.slice(i, i + 10));
    }

    let allItems: any[] = [];
    
    // We can run these in parallel too, limited by session availability
    const chunkPromises = chunks.map(async (chunk) => {
        try {
            const url = `/api/trade2/fetch/${chunk.join(',')}?id=placeholder`; 
            const response = await requestWithRotation(sessIds, 'get', url);

            if (response.data && response.data.result) {
                return response.data.result;
            }
        } catch (error: any) {
            console.error("Error fetching item details chunk:", error.response?.status, error.message);
            return [];
        }
        return [];
    });

    const results = await Promise.all(chunkPromises);
    results.forEach(res => {
        allItems = allItems.concat(res);
    });
    
    return allItems;
}