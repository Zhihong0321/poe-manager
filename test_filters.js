import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
async function testFilters() {
    const url = `https://www.pathofexile.com/api/trade2/search/${process.env.LEAGUE}`;
    // We suspect 'evasion' is wrong. Common abbreviations are 'ev', 'ar', 'es'.
    const filtersToTest = [
        { key: 'evasion', value: { min: 100 } },
        { key: 'ev', value: { min: 100 } },
        { key: 'ar', value: { min: 100 } },
        { key: 'armour', value: { min: 100 } },
        { key: 'es', value: { min: 100 } },
        { key: 'energy_shield', value: { min: 100 } }
    ];
    for (const test of filtersToTest) {
        console.log(`Testing filter key: ${test.key}`);
        const query = {
            query: {
                status: { option: "online" },
                filters: {
                    equipment_filters: {
                        filters: {
                            [test.key]: test.value
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
            console.log(`✅ Success: ${test.key}`);
        }
        catch (error) {
            if (error.response && error.response.data) {
                // Check if it's the specific invalid filter error
                const msg = error.response.data.error?.message || '';
                if (msg.includes('Invalid filter')) {
                    console.log(`❌ Invalid Key: ${test.key}`);
                }
                else {
                    console.log(`❌ Failed: ${test.key} - ${JSON.stringify(error.response.data)}`);
                }
            }
            else {
                console.log(`❌ Failed: ${test.key} - ${error.message}`);
            }
        }
    }
}
testFilters();
//# sourceMappingURL=test_filters.js.map