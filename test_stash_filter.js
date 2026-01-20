import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
async function testStashFilter() {
    const url = `https://www.pathofexile.com/api/trade2/search/${process.env.LEAGUE}`;
    // Attempt to filter by stash tab name
    const query = {
        query: {
            status: { option: "any" },
            filters: {
                trade_filters: {
                    filters: {
                        account: { input: process.env.POE_ACCOUNT },
                        // pure guess: stash name?
                        // stash: { input: "Sale" } 
                    }
                }
            }
        },
        sort: { price: "asc" }
    };
    console.log("Testing generic search...");
    try {
        const res = await axios.post(url, query, {
            headers: {
                'Cookie': `POESESSID=${process.env.POESESSID}`,
                'User-Agent': 'PoE2TradeManager/1.0',
                'Content-Type': 'application/json'
            }
        });
        console.log(`Generic Search Result: ${res.data.total} items`);
    }
    catch (e) {
        console.log("Error:", e.message);
    }
}
testStashFilter();
//# sourceMappingURL=test_stash_filter.js.map