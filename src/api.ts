import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const POE_ACCOUNT = process.env.POE_ACCOUNT || ''; // e.g. zhihong0321
const POESESSID = process.env.POESESSID || '';
const USER_AGENT = 'PoE2TradeManager/1.0';

if (!POESESSID) {
    console.warn("WARNING: POESESSID is missing in .env. API calls will fail.");
}

const client = axios.create({
    baseURL: 'https://www.pathofexile.com', 
    headers: {
        'Cookie': `POESESSID=${POESESSID}`,
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    }
});

// Interface for Tab Metadata
interface Tab {
    n: string; // Name
    i: number; // Index
    id: string;
    type: string;
    hidden: boolean;
    selected: boolean;
    colour?: any;
    srcL?: string;
    srcC?: string;
    srcR?: string;
}

// Interface for Stash Tab Response
interface StashTabResponse {
    numTabs: number;
    tabs: Tab[];
    items?: any[]; // Items are only present if requesting a specific index
}

export async function getStashTabs(league: string = 'Standard') { 
    try {
        const encodedLeague = encodeURIComponent(league);
        const url = `/api/trade2/search/${encodedLeague}`;
        console.log(`Searching for seller items: ${client.defaults.baseURL}${url}`);
        console.log(`Using Account: ${POE_ACCOUNT}`);
        
        // Try the standard account filter
        let query: any = {
            query: {
                status: { option: "any" },
                filters: {
                    trade_filters: {
                        filters: {
                            account: { input: POE_ACCOUNT }
                        }
                    }
                }
            }
        };

        let response = await client.post(url, query);
        
        // If 0 items and POE_ACCOUNT doesn't have a hashtag, try with the user-provided hashtag if possible
        // But since we don't have it in POE_ACCOUNT, let's try the user's specific string first
        if (response.data?.result?.length === 0 && !POE_ACCOUNT.includes('#')) {
             const alternativeAccount = "zhihong0321#0501";
             console.log(`No items found for ${POE_ACCOUNT}, trying alternative: ${alternativeAccount}`);
             query.query.filters.trade_filters.filters.account.input = alternativeAccount;
             response = await client.post(url, query);
        }

        if (response.data && response.data.result) {
            console.log(`Found ${response.data.result.length} items for ${query.query.filters.trade_filters.filters.account.input}`);
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


export async function fetchItemDetails(itemIds: string[]) {
    if (itemIds.length === 0) return [];
    
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

