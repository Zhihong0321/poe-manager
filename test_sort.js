import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
async function testSort() {
    const url = `https://www.pathofexile.com/api/trade2/search/${process.env.LEAGUE}`;
    // Suspect 'evasion' is wrong. 
    // Usually sorting by stat requires { "stat": "evasion_rating" } or similar?
    // Or simplified keys like 'price', 'indexed'.
    const sortsToTest = [
        { key: 'evasion', label: 'Simple String: evasion' },
        { key: { evasion: "desc" }, label: 'Object: { evasion: "desc" }' },
        { key: { ev: "desc" }, label: 'Object: { ev: "desc" }' },
        { key: { stats: [{ type: "count", min: 1 }] }, label: 'Complex Stat Sort?' } // Usually distinct
    ];
    // Actually, look at the error: "Unknown sort key: evasion"
    // This comes from `sort: { "evasion": "desc" }`.
    // The valid sort keys for stats are usually within a specific structure OR mapped.
    // Let's try:
    // 1. 'evasion_rating'
    // 2. 'ar' (since 'ar' worked for filter)
    // 3. 'es'
    const keys = ["evasion", "ev", "evasion_rating", "ar", "es"];
    for (const k of keys) {
        console.log(`Testing sort key: ${k}`);
        const query = {
            query: { status: { option: "online" } },
            sort: { [k]: "desc" }
        };
        try {
            await axios.post(url, query, {
                headers: { 'User-Agent': 'PoE2TradeManager/1.0', 'Content-Type': 'application/json' }
            });
            console.log(`✅ Success: ${k}`);
        }
        catch (error) {
            const msg = error.response?.data?.error?.message || error.message;
            console.log(`❌ Failed: ${k} - ${msg}`);
        }
    }
}
testSort();
//# sourceMappingURL=test_sort.js.map