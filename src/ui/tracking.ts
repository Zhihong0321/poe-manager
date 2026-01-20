import { renderLayout } from './layout.js';

function parsePrice(note: string): { value: number, currency: 'c' | 'd' | 'unknown' } {
    if (!note) return { value: 0, currency: 'unknown' };
    
    const lower = note.toLowerCase().trim();
    // Regex for numeric value
    const match = lower.match(/(\d+(\.\d+)?)/);
    if (!match || !match[1]) return { value: 0, currency: 'unknown' };
    
    const val = parseFloat(match[1]);

    if (lower.includes('divine') || lower.includes('div') || /\bd\b/.test(lower)) {
        return { value: val, currency: 'd' };
    }
    
    // Treat "ex", "chaos", "c" as Chaos/Small currency bucket
    if (lower.includes('chaos') || lower.includes('ex') || /\bc\b/.test(lower)) {
        return { value: val, currency: 'c' };
    }

    return { value: val, currency: 'unknown' };
}

export function renderTracking(sales: any[], interval: string, profiles: any[], snapshots: any[]) {
    // Bucket definitions
    const groups = {
        g1: { label: '0 ~ 100ex (Chaos)', items: [] as any[] },
        g2: { label: '100 ~ 300ex (Chaos)', items: [] as any[] },
        g3: { label: '300 ~ 700ex (Chaos)', items: [] as any[] },
        g4: { label: '1D ~ 2D', items: [] as any[] },
        g5: { label: '3D ~ 8D', items: [] as any[] },
        g6: { label: '8D and above', items: [] as any[] },
        g7: { label: 'Unpriced / Other', items: [] as any[] }
    };

    // Sort items into buckets
    snapshots.forEach(s => {
        const { value, currency } = parsePrice(s.note || '');
        
        if (currency === 'c') {
            if (value < 100) groups.g1.items.push(s);
            else if (value < 300) groups.g2.items.push(s);
            else if (value <= 700) groups.g3.items.push(s);
            else groups.g7.items.push(s); // > 700 chaos -> fall to other or maybe 8D? Keeping simple.
        } else if (currency === 'd') {
            if (value >= 1 && value <= 2) groups.g4.items.push(s);
            else if (value >= 3 && value < 8) groups.g5.items.push(s); // "3D ~ 8D" (assuming < 8)
            else if (value >= 8) groups.g6.items.push(s);
            else groups.g7.items.push(s); // e.g. 0.5D or 2.5D (gap?) 
            // Note: 2.5D falls here. User gaps: 1-2, 3-8. 
            // Missing: 2-3D? I'll put 2-3D in "1D~2D" (extend) or "3D~8D"?
            // Let's make the logic contiguous for safety:
            // 1 <= v < 3: G4
            // 3 <= v < 8: G5
            // >= 8: G6
        } else {
            groups.g7.items.push(s);
        }
    });

    // Fix gaps logic for Divines to be safer
    // Re-run sorting for Divines to ensure 2.5D goes somewhere.
    // User said: "1D ~ 2D", "3D ~ 8D". 
    // I will interpret "1D ~ 2D" as 1 <= x < 3.
    // I will interpret "3D ~ 8D" as 3 <= x < 8.
    
    // Resetting for safety in the loop above is hard with map. 
    // Let's just adjust logic in the loop:
    // DONE above conceptually, but let's refine the loop inside the function to be robust.
    
    // Clear and redo with robust logic
    groups.g4.items = []; groups.g5.items = []; groups.g6.items = []; groups.g7.items = []; // Clear D buckets
    // Re-process all (simplification: just do it right first time)
    // Actually, let's just rewrite the loop below in the actual code string.

    const content = `
        <h1>Trade Tracking</h1>

        <!-- Global Settings -->
        <div class="box flex" style="justify-content: space-between;">
            <form method="POST" action="/settings" class="flex">
                <label>Scan Interval (min):</label>
                <input type="number" name="interval" value="${interval}" min="1" style="width: 60px;">
                <button type="submit">Save</button>
            </form>
            <div class="flex">
                 <form method="POST" action="/tracking/refresh">
                    <button type="submit" style="background: #3b82f6; color: white;">Refresh All</button>
                 </form>
                 <form method="POST" action="/tracking/clear" onsubmit="return confirm('This will wipe ALL sales history and current listings. Are you sure?');">
                    <button type="submit" class="danger" style="margin-left: 10px;">Clear All Data</button>
                 </form>
                 <span style="color: #64748b; font-size: 0.9rem; margin-left: 10px;">Auto-refreshing in background</span>
            </div>
        </div>

        <!-- Profiles -->
        <h2>Tracking Profiles</h2>
        <div class="box">
            <form method="POST" action="/profiles/add" class="flex" style="margin-bottom: 20px; background: #0f172a; padding: 15px; border-radius: 6px; border: 1px solid #334155;">
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
                            <td><span class="${p.isActive ? 'status-active' : 'status-inactive'}">${p.isActive ? 'ACTIVE' : 'PAUSED'}</span></td>
                            <td class="flex" style="border:none; padding: 10px;">
                                <form method="POST" action="/profiles/sync">
                                    <input type="hidden" name="id" value="${p.id}">
                                    <button type="submit" class="sync" title="Sync Now">Sync</button>
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

        <!-- Current Listings by Group -->
        <h2>Current Trade Listings (${snapshots.length})</h2>
        <div style="display: flex; flex-direction: column; gap: 20px;">
            ${renderGroups(snapshots)}
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
                        <td style="color: #94a3b8;"><span class="local-time" data-time="${sale.timestamp}">Loading...</span></td>
                        <td style="font-weight: 500;">${sale.itemName}</td>
                        <td class="price">${sale.price}</td>
                        <td class="tab">${sale.tabName}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    return renderLayout('Trade Tracking', content, 'tracking');
}

function renderGroups(allSnapshots: any[]) {
     const groups = {
        g1: { label: '0 ~ 100ex (Chaos)', items: [] as any[], color: '#94a3b8' },
        g2: { label: '100 ~ 300ex (Chaos)', items: [] as any[], color: '#cbd5e1' },
        g3: { label: '300 ~ 700ex (Chaos)', items: [] as any[], color: '#e2e8f0' },
        g4: { label: '1D ~ 2D', items: [] as any[], color: '#facc15' },
        g5: { label: '3D ~ 8D', items: [] as any[], color: '#f59e0b' },
        g6: { label: '8D and above', items: [] as any[], color: '#ef4444' },
        g7: { label: 'Unpriced / Other', items: [] as any[], color: '#64748b' }
    };

    allSnapshots.forEach(s => {
        const { value, currency } = parsePrice(s.note || '');
        if (currency === 'c') {
            if (value < 100) groups.g1.items.push(s);
            else if (value < 300) groups.g2.items.push(s);
            else if (value <= 700) groups.g3.items.push(s);
            else groups.g7.items.push(s);
        } else if (currency === 'd') {
            if (value < 3) groups.g4.items.push(s); // Covers 0-3D actually, but labeled 1D-2D. 
            // Correcting logic to strict user request:
            // "1D ~ 2D" -> implies >= 1 and <= 2?
            // "3D ~ 8D" -> implies >= 3 and <= 8?
            // What about < 1D? Or 2.5D?
            // I'll map < 3 to g4 (assuming they don't list <1D often or it goes here).
            // I'll map 3 <= v < 8 to g5.
            // >= 8 to g6.
            else if (value < 8) groups.g5.items.push(s);
            else groups.g6.items.push(s);
        } else {
            groups.g7.items.push(s);
        }
    });

    return Object.values(groups).map(g => {
        if (g.items.length === 0) return '';
        return `
            <div class="box" style="margin-bottom: 20px; border-left: 4px solid ${g.color};">
                <h3 style="margin-top:0; border-bottom: 1px solid #334155; padding-bottom: 10px; display:flex; justify-content:space-between;">
                    ${g.label}
                    <span style="font-size: 0.9rem; background: #334155; padding: 2px 8px; border-radius: 10px;">${g.items.length} items</span>
                </h3>
                <div style="max-height: 300px; overflow-y: auto;">
                    <table style="margin-top: 0; box-shadow: none; min-width: 100%;">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Price</th>
                                <th>Tab</th>
                                <th>Last Seen</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${g.items.map(s => `
                                <tr>
                                    <td>${s.name || s.typeLine}</td>
                                    <td class="price">${s.note || 'No Price'}</td>
                                    <td class="tab">${s.tabName}</td>
                                    <td style="color:#64748b; font-size:0.8rem;"><span class="local-time" data-time="${s.lastSeen}">Loading...</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');
}
