import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
async function testCategory() {
    const url = `https://www.pathofexile.com/api/trade2/search/${process.env.LEAGUE}`;
    // Test a simple category search
    // Try 'armour.chest' instead of 'armour.body'?
    // Try just 'armour'?
    const categoriesToTest = ['armour.body', 'armour.chest', 'armour', 'weapon.bow', 'accessory.ring'];
    for (const cat of categoriesToTest) {
        console.log(`Testing category: ${cat}`);
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
                headers: {
                    'User-Agent': 'PoE2TradeManager/1.0',
                    'Content-Type': 'application/json'
                }
            });
            console.log(`✅ Success: ${cat}`);
        }
        catch (error) {
            if (error.response && error.response.data) {
                console.log(`❌ Failed: ${cat} - ${JSON.stringify(error.response.data)}`);
            }
            else {
                console.log(`❌ Failed: ${cat} - ${error.message}`);
            }
        }
    }
}
testCategory();
//# sourceMappingURL=test_categories.js.map