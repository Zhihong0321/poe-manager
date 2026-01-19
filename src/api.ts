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
        let query: any = {
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

        let response = await client.post(url, query);
        
        // Fallback for hashtag logic
        if (response.data?.result?.length === 0 && !accountName.includes('#')) {
             // Logic to handle fallback if needed, or user must provide full tag in profile
             // For now we assume user puts correct tag in profile
             console.log(`No items found for ${accountName}. Ensure the profile has the correct account name (e.g. Name#1234).`);
        }

        if (response.data && response.data.result) {
            console.log(`Found ${response.data.result.length} items for ${accountName}`);
            return response.data.result; 
        } else {
            console.error("Search API failed or returned no results:", response.data);
            return [];
        }
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



