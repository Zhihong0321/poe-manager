import express from 'express';
import { getSalesHistory, getSetting, setSetting, initDB } from './db.js';
import { startMonitor } from './monitor.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// Ultra-simple HTML renderer
const renderPage = (sales: any[], interval: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PoE 2 Sales Tracker</title>
    <style>
        body { font-family: monospace; background: #111; color: #eee; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: #facc15; border-bottom: 2px solid #333; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #333; }
        th { color: #888; text-transform: uppercase; font-size: 0.8rem; }
        tr:hover { background: #222; }
        .price { color: #4ade80; font-weight: bold; }
        .tab { color: #9ca3af; font-size: 0.9rem; }
        .settings { background: #222; padding: 15px; border-radius: 8px; margin-bottom: 30px; display: flex; align-items: center; gap: 10px; }
        input { background: #333; border: 1px solid #444; color: white; padding: 5px 10px; border-radius: 4px; }
        button { background: #facc15; border: none; color: black; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
        button:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <h1>💰 PoE 2 Sales Tracker</h1>

    <form class="settings" method="POST" action="/settings">
        <label>Scan Interval (min):</label>
        <input type="number" name="interval" value="${interval}" min="1" style="width: 60px;">
        <button type="submit">Save</button>
    </form>

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
        res.send(renderPage(sales, interval));
    } catch (err) {
        res.status(500).send('Database Error');
    }
});

app.post('/settings', async (req, res) => {
    const { interval } = req.body;
    if (interval) {
        await setSetting('scan_interval_min', interval);
    }
    res.redirect('/');
});

// Start
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await initDB();
    startMonitor();
});