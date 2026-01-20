console.log("SERVER FILE LOADING...");
import express from 'express';
import { 
    getSalesHistory, getSetting, setSetting, initDB, addProfile, getProfiles, 
    deleteProfile, toggleProfile, getAllSnapshots, getProfileById,
    getMarketProfiles, addMarketProfile, deleteMarketProfile, toggleMarketProfile, getMarketSnapshots, getMarketProfileById, updateMarketProfile,
    clearAllTrackingData, updateProfile
} from './db.js';
import { startMonitor } from './monitor.js';
import { scan } from './scanner.js';
import { runMarketScans, executeMarketScan } from './market_scanner.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderTracking } from './ui/tracking.js';
import { renderMarket } from './ui/market.js';
import { renderEditProfile } from './ui/edit_profile.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));

// --- Page Routes ---

app.get('/', async (req, res) => {
    res.send(renderDashboard());
});

app.get('/tracking', async (req, res) => {
    try {
        const sales = await getSalesHistory();
        const interval = await getSetting('scan_interval_min') || '10';
        const profiles = await getProfiles();
        const snapshots = await getAllSnapshots();
        res.send(renderTracking(sales, interval, profiles, snapshots));
    } catch (err) {
        console.error(err);
        res.status(500).send('Database Error');
    }
});

app.get('/profiles/edit/:id', async (req, res) => {
    try {
        const profile = await getProfileById(Number(req.params.id));
        if (!profile) return res.status(404).send('Profile not found');
        res.send(renderEditProfile(profile));
    } catch (err) {
        console.error(err);
        res.status(500).send('Database Error');
    }
});

app.get('/market', async (req, res) => {

    try {
        const profiles = await getMarketProfiles();
        const snapshotsByProfile: Record<number, any[]> = {};
        
        for (const profile of profiles) {
            snapshotsByProfile[profile.id] = await getMarketSnapshots(profile.id, 24);
        }
        
        res.send(renderMarket(profiles, snapshotsByProfile));
    } catch (err) {
        console.error(err);
        res.status(500).send('Database Error');
    }
});

// --- Action Routes ---

app.post('/market/profiles/add', async (req, res) => {
    const p = req.body;
    await addMarketProfile({
        name: p.name,
        league: p.league,
        itemCategory: p.itemCategory,
        minIlvl: p.minIlvl ? parseInt(p.minIlvl) : null,
        maxIlvl: p.maxIlvl ? parseInt(p.maxIlvl) : null,
        minReqLevel: p.minReqLevel ? parseInt(p.minReqLevel) : null,
        maxReqLevel: p.maxReqLevel ? parseInt(p.maxReqLevel) : null,
        minQuality: p.minQuality ? parseInt(p.minQuality) : null,
        minEvasion: p.minEvasion ? parseInt(p.minEvasion) : null,
        minArmour: p.minArmour ? parseInt(p.minArmour) : null,
        minEs: p.minEs ? parseInt(p.minEs) : null,
        sortBy: p.sortBy,
        intervalMin: parseInt(p.intervalMin || '60')
    });
    res.redirect('/market');
});

app.post('/market/profiles/update', async (req, res) => {
    const p = req.body;
    await updateMarketProfile(Number(p.id), {
        name: p.name,
        league: p.league,
        itemCategory: p.itemCategory,
        minIlvl: p.minIlvl ? parseInt(p.minIlvl) : null,
        maxIlvl: p.maxIlvl ? parseInt(p.maxIlvl) : null,
        minReqLevel: p.minReqLevel ? parseInt(p.minReqLevel) : null,
        maxReqLevel: p.maxReqLevel ? parseInt(p.maxReqLevel) : null,
        minQuality: p.minQuality ? parseInt(p.minQuality) : null,
        minEvasion: p.minEvasion ? parseInt(p.minEvasion) : null,
        minArmour: p.minArmour ? parseInt(p.minArmour) : null,
        minEs: p.minEs ? parseInt(p.minEs) : null,
        sortBy: p.sortBy,
        intervalMin: parseInt(p.intervalMin || '60')
    });
    res.redirect('/market');
});

app.post('/market/profiles/toggle', async (req, res) => {
    const { id, isActive } = req.body;
    await toggleMarketProfile(Number(id), isActive === 'true');
    res.redirect('/market');
});

app.post('/market/profiles/sync', async (req, res) => {
    const { id } = req.body;
    const profile = await getMarketProfileById(Number(id));
    if (profile) {
        console.log(`Manual market scan triggered for ${profile.name}`);
        await executeMarketScan(profile);
    }
    res.redirect('/market');
});

app.post('/market/profiles/delete', async (req, res) => {
    const { id } = req.body;
    await deleteMarketProfile(Number(id));
    res.redirect('/market');
});

app.post('/settings', async (req, res) => {
    const { interval } = req.body;
    if (interval) {
        await setSetting('scan_interval_min', interval);
    }
    res.redirect('/tracking');
});

app.post('/profiles/add', async (req, res) => {
    const { accountName, league, sessId, sessId_1, sessId_2, sessId_3 } = req.body;
    
    // Collect all valid cookies from various input forms
    const sessIds: string[] = [];
    
    // Legacy/Combined Input
    if (sessId) {
        sessId.split(/[,\n]+/).forEach((s: string) => {
            const trimmed = s.trim();
            if (trimmed) sessIds.push(trimmed);
        });
    }
    
    // Separate Inputs
    if (sessId_1 && sessId_1.trim()) sessIds.push(sessId_1.trim());
    if (sessId_2 && sessId_2.trim()) sessIds.push(sessId_2.trim());
    if (sessId_3 && sessId_3.trim()) sessIds.push(sessId_3.trim());

    if (accountName && league && sessIds.length > 0) {
        // Remove duplicates just in case
        const uniqueIds = Array.from(new Set(sessIds));
        await addProfile(accountName, league, uniqueIds);
    }
    res.redirect('/tracking');
});

app.post('/profiles/update', async (req, res) => {
    const { id, accountName, league, sessId_1, sessId_2, sessId_3 } = req.body;
    
    const sessIds: string[] = [];
    if (sessId_1 && sessId_1.trim()) sessIds.push(sessId_1.trim());
    if (sessId_2 && sessId_2.trim()) sessIds.push(sessId_2.trim());
    if (sessId_3 && sessId_3.trim()) sessIds.push(sessId_3.trim());

    if (id && accountName && league) {
        await updateProfile(Number(id), accountName, league, sessIds);
    }
    res.redirect('/tracking');
});

app.post('/profiles/toggle', async (req, res) => {
    const { id, isActive } = req.body;
    await toggleProfile(Number(id), isActive === 'true');
    res.redirect('/tracking');
});

app.post('/profiles/delete', async (req, res) => {
    const { id } = req.body;
    await deleteProfile(Number(id));
    res.redirect('/tracking');
});

app.post('/profiles/sync', async (req, res) => {
    const { id } = req.body;
    const profile = await getProfileById(Number(id));
    if (profile) {
        console.log(`Manual sync triggered for ${profile.accountName}`);
        await scan(profile);
    }
    res.redirect('/tracking');
});

app.post('/tracking/refresh', async (req, res) => {
    console.log("Manual refresh triggered for all profiles.");
    const profiles = await import('./db.js').then(m => m.getActiveProfiles());
    for (const p of profiles) {
        await scan(p);
    }
    res.redirect('/tracking');
});

app.post('/tracking/clear', async (req, res) => {
    console.log("Clearing all tracking data...");
    await clearAllTrackingData();
    res.redirect('/tracking');
});

// Start

console.log("Starting server initialization...");

const server = app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    try {
        console.log("Initializing database...");
        await initDB();
        console.log("Database initialized. Starting monitor...");
        startMonitor();
        console.log("Monitor started.");
    } catch (err) {
        console.error("Initialization failed (Server will continue running):", err);
    }
});

server.on('error', (err) => {
    console.error("Server error:", err);
});
