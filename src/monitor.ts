import { scan } from './scanner.js';
import { runMarketScans } from './market_scanner.js';
import { getSetting, initDB, getActiveProfiles } from './db.js';

let isRunning = false;

export async function startMonitor() {
    if (isRunning) return;
    isRunning = true;
    console.log(`Starting PoE 2 Sales & Market Monitor.`);
    
    try {
        // Ensure DB is ready
        await initDB();
        scheduleScan();
    } catch (err) {
        console.error("Monitor failed to start due to DB error:", err);
        isRunning = false;
    }
}

async function scheduleScan() {
    if (!isRunning) return;

    // 1. Sales Tracking Scans
    const intervalStr = await getSetting('scan_interval_min');
    const intervalMin = parseInt(intervalStr || '10', 10);
    
    const profiles = await getActiveProfiles();
    if (profiles.length > 0) {
        for (const profile of profiles) {
            await scan(profile);
        }
    }

    // 2. Market Watch Scans
    try {
        await runMarketScans();
    } catch (err) {
        console.error("Market scan error:", err);
    }

    const intervalMs = Math.max(1, intervalMin) * 60 * 1000;
    console.log(`Next check in ${intervalMin} minutes.`);
    if (isRunning) {
        setTimeout(scheduleScan, intervalMs);
    }
}

// Only auto-start if run directly (CLI mode)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    startMonitor();
}

