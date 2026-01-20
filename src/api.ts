import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const USER_AGENT = 'PoE2TradeManager/1.0';

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

export async function getStashTabs(accountName: string, league: string, sessId: string) { 
    const client = createClient(sessId);
    try {
        const encodedLeague = encodeURIComponent(league);
        const url = `/api/trade2/search/${encodedLeague}`;
        console.log(`Searching for seller items: ${client.defaults.baseURL}${url}`);
        console.log(`Using Account: ${accountName}`);
        
        // Try the standard account filter
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

        // Strategy: Fetch Cheapest (Asc), Most Expensive (Desc), and Newest (Indexed Desc)
        // This covers the edges and the latest activity, maximizing coverage despite the 100-item limit.
        const queryAsc = { ...baseQuery, sort: { price: "asc" } };
        const queryDesc = { ...baseQuery, sort: { price: "desc" } };
        const queryNew = { ...baseQuery, sort: { indexed: "desc" } };

        console.log(`[Scan] Fetching items for ${accountName} (Price Asc/Desc + Newest)...`);

        const [resAsc, resDesc, resNew] = await Promise.all([
            client.post(url, queryAsc).catch(e => ({ data: { result: [], total: 0 }, error: e })),
            client.post(url, queryDesc).catch(e => ({ data: { result: [], total: 0 }, error: e })),
            client.post(url, queryNew).catch(e => ({ data: { result: [], total: 0 }, error: e }))
        ]);

        const ids = new Set<string>();
        let totalOnServer = 0;

        // Helper to process results
        const processRes = (res: any) => {
            if (res.data && res.data.result) {
                res.data.result.forEach((id: string) => ids.add(id));
                if (res.data.total > totalOnServer) totalOnServer = res.data.total;
            }
        };

        processRes(resAsc);
        processRes(resDesc);
        processRes(resNew);

        // Check for truncation
        if (ids.size < totalOnServer) {
            console.log(`[Scan] Truncation detected (Found ${ids.size} / ${totalOnServer}). initiating Deep Scan by Category...`);
            
            const categories = ['weapon', 'armour', 'accessory', 'jewel', 'card', 'gem'];
            
            for (const cat of categories) {
                // Construct category-specific query
                const catQuery = JSON.parse(JSON.stringify(baseQuery));
                if (!catQuery.query.filters.type_filters) catQuery.query.filters.type_filters = {};
                if (!catQuery.query.filters.type_filters.filters) catQuery.query.filters.type_filters.filters = {};
                catQuery.query.filters.type_filters.filters.category = { option: cat };
                
                // For each category, we just need "Asc" and "Desc" to cover range. 
                // "New" is less critical per-category but good if we have capacity.
                // Let's stick to Asc + Desc to keep request count reasonable (2 per cat).
                
                const qAsc = { ...catQuery, sort: { price: "asc" } };
                const qDesc = { ...catQuery, sort: { price: "desc" } };
                
                try {
                    // Run sequentially to avoid rate limits
                    const [r1, r2] = await Promise.all([
                        client.post(url, qAsc).catch(e => ({ data: { result: [] } })),
                        client.post(url, qDesc).catch(e => ({ data: { result: [] } }))
                    ]);
                    
                    if (r1.data?.result) r1.data.result.forEach((id: string) => ids.add(id));
                    if (r2.data?.result) r2.data.result.forEach((id: string) => ids.add(id));
                    
                    console.log(`[Scan] Category ${cat}: ${ids.size} total items so far...`);
                    
                    // Delay to avoid rate limits (2s)
                    await new Promise(r => setTimeout(r, 2000));
                    
                } catch (err: any) {
                    console.error(`[Scan] Error scanning category ${cat}:`, err.response?.data || err.message);
                }
            }
        }

        const combinedIds = Array.from(ids);
        console.log(`Found ${combinedIds.length} unique items (Server Total: ${totalOnServer})`);

        if (combinedIds.length === 0) {
             // Logic to handle fallback if needed, or user must provide full tag in profile
             if (!accountName.includes('#')) {
                 console.log(`No items found for ${accountName}. Ensure the profile has the correct account name (e.g. Name#1234).`);
             }
             return [];
        }

        return combinedIds;
    } catch (error: any) {
        console.error("Error in search API:", error.response?.status, error.response?.data || error.message);
        return [];
    }
}

// Generic Market Search (for trends/analysis)
export async function searchTrade(league: string, query: any, sessId: string) {
    const client = createClient(sessId);
    try {
        const encodedLeague = encodeURIComponent(league);
        const url = `/api/trade2/search/${encodedLeague}`;
        console.log(`Market Search: ${url}`);
        
        const response = await client.post(url, query);
        
        if (response.data && response.data.result) {
            return {
                id: response.data.id, // The search ID (e.g. "x7m3..."), useful for pagination URL
                total: response.data.total, // Total results count
                result: response.data.result // First 100 IDs
            };
        }
        return null;
    } catch (error: any) {
        console.error("Error in Market Search:", error.response?.status, error.response?.data || error.message);
        return null;
    }
}

export async function fetchItemDetails(itemIds: string[], sessId: string) {
    if (itemIds.length === 0) return [];
    const client = createClient(sessId);
    
    // Trade API fetch limit is usually 10 items per call
    const chunks = [];
    for (let i = 0; i < itemIds.length; i += 10) {
        chunks.push(itemIds.slice(i, i + 10));
    }

    let allItems: any[] = [];
    for (const chunk of chunks) {
        try {
            const url = `/api/trade2/fetch/${chunk.join(',')}?id=placeholder`; 
            const response = await client.get(url);
            if (response.data && response.data.result) {
                allItems = allItems.concat(response.data.result);
            }
            // Sleep 300ms between chunks to respect basic rate limits
            await new Promise(r => setTimeout(r, 300));
        } catch (error: any) {
            console.error("Error fetching item details:", error.response?.status, error.response?.data || error.message);
        }
    }
    return allItems;
}



