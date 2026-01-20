import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
async function testCats() {
    const url = `https://www.pathofexile.com/api/trade2/search/${process.env.LEAGUE}`;
    const cats = ['weapon', 'armour', 'accessory', 'jewel', 'flask', 'card', 'currency', 'map', 'gem'];
    for (const cat of cats) {
        console.log(`Testing: ${cat}`);
        const query = {
            query: {
                status: { option: "online" },
                filters: {
                    type_filters: {
                        filters: {
                            category: { option: cat }
                        }
                    }
                }
            },
            sort: { price: "asc" }
        };
        try {
            await axios.post(url, query, {
                headers: { 'User-Agent': 'PoE2TradeManager/1.0', 'Content-Type': 'application/json' }
            });
            console.log(`✅ Valid: ${cat}`);
        }
        catch (error) {
            console.log(`❌ Invalid: ${cat} - ${JSON.stringify(error.response?.data)}`);
        }
    }
}
testCats();
//# sourceMappingURL=test_deep_scan_cats.js.map