import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
async function testStashAccess() {
    const account = "zhihong0321#0501"; // Hardcoded from logs
    const league = process.env.LEAGUE;
    const sessId = process.env.POESESSID;
    // Standard Chrome User-Agent to avoid Cloudflare blocking
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    // Endpoint for tab metadata
    const url = `https://www.pathofexile.com/character-window/get-stash-items?league=${encodeURIComponent(league || '')}&accountName=${encodeURIComponent(account || '')}&tabs=1`;
    console.log(`Testing Stash Access...`);
    console.log(`URL: ${url}`);
    console.log(`Account: ${account}`);
    try {
        const response = await axios.get(url, {
            headers: {
                'Cookie': `POESESSID=${sessId}`,
                'User-Agent': UA
            }
        });
        if (response.data && response.data.tabs) {
            console.log(`✅ Success! Found ${response.data.tabs.length} tabs.`);
            // Log first few tabs to confirm
            response.data.tabs.slice(0, 3).forEach((t) => {
                console.log(`- [${t.i}] ${t.n} (Type: ${t.type})`);
            });
            // Try fetching items from the first public tab
            const publicTab = response.data.tabs.find((t) => t.type !== 'RemoveOnly'); // Just pick a normal tab
            if (publicTab) {
                console.log(`\nFetching items from tab '${publicTab.n}' (Index ${publicTab.i})...`);
                const tabUrl = `https://www.pathofexile.com/character-window/get-stash-items?league=${encodeURIComponent(league || '')}&accountName=${encodeURIComponent(account || '')}&tabIndex=${publicTab.i}`;
                const tabRes = await axios.get(tabUrl, {
                    headers: {
                        'Cookie': `POESESSID=${sessId}`,
                        'User-Agent': UA
                    }
                });
                console.log(`✅ Retrieved ${tabRes.data.items?.length} items from tab.`);
            }
        }
        else {
            console.log("❌ Response OK but no tabs found:", response.data);
        }
    }
    catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${JSON.stringify(error.response.data)}`);
        }
    }
}
testStashAccess();
//# sourceMappingURL=test_stash_access.js.map