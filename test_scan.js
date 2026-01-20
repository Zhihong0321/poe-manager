import { scan } from './src/scanner.js';
import { getActiveProfiles, initDB, pool } from './src/db.js';
async function runTest() {
    await initDB();
    const profiles = await getActiveProfiles();
    console.log(`Found ${profiles.length} active profiles.`);
    if (profiles.length > 0) {
        console.log(`Running scan for ${profiles[0].accountName}...`);
        await scan(profiles[0]);
    }
    else {
        console.log("No active profiles found. Please add one in the UI first.");
    }
    await pool.end();
}
runTest().catch(console.error);
//# sourceMappingURL=test_scan.js.map