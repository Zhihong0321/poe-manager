import express from 'express';
import { getSalesHistory, getSetting, setSetting, initDB, addProfile, getProfiles, deleteProfile, toggleProfile, getAllSnapshots, getProfileById } from './db.js';
import { startMonitor } from './monitor.js';
import { scan } from './scanner.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// Ultra-simple HTML renderer
const renderPage = (sales: any[], interval: string, profiles: any[], snapshots: any[]) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PoE 2 Sales Tracker</title>
    <style>
        body { font-family: monospace; background: #111; color: #eee; padding: 20px; max-width: 1000px; margin: 0 auto; }
        h1 { color: #facc15; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #aaa; margin-top: 40px; border-bottom: 1px solid #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #333; }
        th { color: #888; text-transform: uppercase; font-size: 0.8rem; }
        tr:hover { background: #222; }
        .price { color: #4ade80; font-weight: bold; }
        .tab { color: #9ca3af; font-size: 0.9rem; }
        .box { background: #222; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .flex { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        input, select { background: #333; border: 1px solid #444; color: white; padding: 8px; border-radius: 4px; }
        button { background: #facc15; border: none; color: black; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
        button:hover { opacity: 0.9; }
        button.danger { background: #ef4444; color: white; }
        button.toggle { background: #3b82f6; color: white; }
        button.sync { background: #10b981; color: white; }
        .status-active { color: #4ade80; }
        .status-inactive { color: #ef4444; }
        .nav { margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px; }
        .nav a { color: #888; text-decoration: none; margin-right: 20px; font-weight: bold; }
        .nav a.active { color: #facc15; }
    </style>
</head>
<body>
    <h1>💰 PoE 2 Sales Tracker</h1>

    <!-- Global Settings -->
    <div class="box flex">
        <form method="POST" action="/settings" class="flex">
            <label>Scan Interval (min):</label>
            <input type="number" name="interval" value="${interval}" min="1" style="width: 60px;">
            <button type="submit">Save Settings</button>
        </form>
        <div style="flex-grow:1; text-align:right;">
             <a href="/" style="color:#facc15; text-decoration:none; font-weight:bold;">Refresh UI</a>
        </div>
    </div>

    <!-- Profiles -->
    <h2>Tracking Profiles</h2>
    <div class="box">
        <form method="POST" action="/profiles/add" class="flex" style="margin-bottom: 20px;">
            <input type="text" name="accountName" placeholder="Account Name (e.g. User#1234)" required style="width: 200px;">
            <input type="text" name="league" placeholder="League" value="Fate of the Vaal" required style="width: 150px;">
            <input type="text" name="sessId" placeholder="POESESSID (Cookie)" required style="flex-grow:1;">
            <button type="submit">Add Profile</button>
        </form>

        <table>
            <thead>
                <tr>
                    <th>Account</th>
                    <th>League</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${profiles.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 10px; color: #555;">No profiles. Add one to start tracking.</td></tr>' : ''}
                ${profiles.map(p => `
                    <tr>
                        <td>${p.accountName}</td>
                        <td>${p.league}</td>
                        <td class="${p.isActive ? 'status-active' : 'status-inactive'}">${p.isActive ? 'ACTIVE' : 'PAUSED'}</td>
                        <td class="flex" style="border:none; padding: 5px;">
                            <form method="POST" action="/profiles/sync">
                                <input type="hidden" name="id" value="${p.id}">
                                <button type="submit" class="sync">Sync Now</button>
                            </form>
                            <form method="POST" action="/profiles/toggle">
                                <input type="hidden" name="id" value="${p.id}">
                                <input type="hidden" name="isActive" value="${!p.isActive}">
                                <button type="submit" class="toggle">${p.isActive ? 'Pause' : 'Resume'}</button>
                            </form>
                            <form method="POST" action="/profiles/delete" onsubmit="return confirm('Are you sure?');">
                                <input type="hidden" name="id" value="${p.id}">
                                <button type="submit" class="danger">Delete</button>
                            </form>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <!-- Current Listings -->
    <h2>Current Trade Listings (${snapshots.length})</h2>
    <div style="max-height: 400px; overflow-y: auto; background: #1a1a1a; border-radius: 8px;">
        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Price</th>
                    <th>Tab</th>
                    <th>Last Seen</th>
                </tr>
            </thead>
            <tbody>
                ${snapshots.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 20px; color: #555;">No items currently indexed. Sync to populate.</td></tr>' : ''}
                ${snapshots.map(s => `
                    <tr>
                        <td>${s.name || s.typeLine}</td>
                        <td class="price">${s.note || 'No Price'}</td>
                        <td class="tab">${s.tabName}</td>
                        <td style="color:#555; font-size:0.7rem;">${new Date(s.lastSeen).toLocaleTimeString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <!-- Sales History -->
    <h2>Sales History</h2>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Price</th>
                <th>Tab</th>
            </tr>
        </thead>
        <tbody>
            ${sales.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 20px; color: #555;">No sales recorded yet.</td></tr>' : ''}
            ${sales.map(sale => `
                <tr>
                    <td>${new Date(sale.timestamp).toLocaleString()}</td>
                    <td>${sale.itemName}</td>
                    <td class="price">${sale.price}</td>
                    <td class="tab">${sale.tabName}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
`;

// Routes
app.get('/', async (req, res) => {
    try {
        const sales = await getSalesHistory();
        const interval = await getSetting('scan_interval_min') || '10';
        const profiles = await getProfiles();
        const snapshots = await getAllSnapshots();
        res.send(renderPage(sales, interval, profiles, snapshots));
    } catch (err) {
        console.error(err);
        res.status(500).send('Database Error');
    }
});

app.post('/profiles/sync', async (req, res) => {
    const { id } = req.body;
    const profile = await getProfileById(Number(id));
    if (profile) {
        console.log(`Manual sync triggered for ${profile.accountName}`);
        await scan(profile);
    }
    res.redirect('/');
});