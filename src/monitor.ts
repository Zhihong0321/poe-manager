import { scan } from './scanner.js';
import { getSetting, initDB } from './db.js';

let isRunning = false;

export async function startMonitor() {
    if (isRunning) return;
    isRunning = true;
    console.log(`Starting PoE 2 Sales Monitor.`);
    
    // Ensure DB is ready
    await initDB();
    
    scheduleScan();
}

async function scheduleScan() {
    if (!isRunning) return;

    // Fetch dynamic interval
    const intervalStr = await getSetting('scan_interval_min');
    const intervalMin = parseInt(intervalStr || '10', 10);
    const intervalMs = Math.max(1, intervalMin) * 60 * 1000; // Minimum 1 minute

    console.log(`Starting scan... (Next in ${intervalMin} mins)`);

    scan().finally(() => {
        if (isRunning) {
            setTimeout(scheduleScan, intervalMs);
        }
    });
}

// Only auto-start if run directly (CLI mode), otherwise Server will start it
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    startMonitor();
}

