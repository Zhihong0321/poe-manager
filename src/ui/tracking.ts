import { renderLayout } from './layout.js';

function parsePrice(note: string): { value: number, currency: 'c' | 'd' | 'ex' | 'unknown' } {
    if (!note) return { value: 0, currency: 'unknown' };
    
    const lower = note.toLowerCase().trim();
    // Regex for numeric value
    const match = lower.match(/(\d+(\.\d+)?)/);
    if (!match || !match[1]) return { value: 0, currency: 'unknown' };
    
    const val = parseFloat(match[1]);

    if (lower.includes('divine') || lower.includes('div') || /\bd\b/.test(lower)) {
        return { value: val, currency: 'd' };
    }
    
    if (lower.includes('exalt') || /\bex\b/.test(lower)) {
        return { value: val, currency: 'ex' };
    }

    if (lower.includes('chaos') || /\bc\b/.test(lower)) {
        return { value: val, currency: 'c' };
    }

    return { value: val, currency: 'unknown' };
}

// Helper to define groups and sort items
function bucketItems(items: any[]) {
    const groups = {
        g1: { label: '0 ~ 100 Chaos', items: [] as any[], color: '#94a3b8' },
        g2: { label: '100 ~ 300 Chaos', items: [] as any[], color: '#cbd5e1' },
        g3: { label: '300 ~ 700 Chaos', items: [] as any[], color: '#e2e8f0' },
        
        gEx1: { label: '0 ~ 10 Exalted', items: [] as any[], color: '#fdba74' }, // Orange-ish
        gEx2: { label: '10 ~ 100 Exalted', items: [] as any[], color: '#fb923c' },
        gEx3: { label: '100+ Exalted', items: [] as any[], color: '#ea580c' },

        g4: { label: '1D ~ 2D', items: [] as any[], color: '#facc15' },
        g5: { label: '3D ~ 8D', items: [] as any[], color: '#f59e0b' },
        g6: { label: '8D and above', items: [] as any[], color: '#ef4444' },
        
        g7: { label: 'Unpriced / Other', items: [] as any[], color: '#64748b' }
    };

    items.forEach(s => {
        // Sales objects use 'price' field, Snapshots use 'note'. Handle both.
        const priceStr = s.note || s.price || '';
        const { value, currency } = parsePrice(priceStr);
        
        if (currency === 'c') {
            if (value < 100) groups.g1.items.push(s);
            else if (value < 300) groups.g2.items.push(s);
            else if (value <= 700) groups.g3.items.push(s);
            else groups.g7.items.push(s); // > 700 Chaos -> Other? Or just keep in g3 or add g3+? Let's put in Unpriced/Other for now or just stick to user buckets
        } else if (currency === 'ex') {
            if (value < 10) groups.gEx1.items.push(s);
            else if (value < 100) groups.gEx2.items.push(s);
            else groups.gEx3.items.push(s);
        } else if (currency === 'd') {
            if (value < 3) groups.g4.items.push(s); // < 3 covers 1D-2D range
            else if (value < 8) groups.g5.items.push(s); // 3D-8D range
            else groups.g6.items.push(s); // >= 8D
        } else {
            groups.g7.items.push(s);
        }
    });
    
    return groups;
}

export function renderTracking(sales: any[], interval: string, profiles: any[], snapshots: any[]) {
    // 1. Bucket the items
    const listedGroups = bucketItems(snapshots);
    const soldGroups = bucketItems(sales);

    // 2. Generate content for groups
    // We iterate over keys (g1...g7)
    const groupKeys = Object.keys(listedGroups) as Array<keyof typeof listedGroups>;
    
    const groupsHtml = groupKeys.map(key => {
        const listed = listedGroups[key];
        const sold = soldGroups[key];
        
        // Skip if empty in both
        if (listed.items.length === 0 && sold.items.length === 0) return '';

        return `
            <div class="box" style="margin-bottom: 20px; border-left: 4px solid ${listed.color}; padding: 0; overflow: hidden;">
                <!-- Header -->
                <div style="padding: 15px; background: rgba(0,0,0,0.2); border-bottom: 1px solid #334155;">
                    <h3 style="margin: 0; color: ${listed.color};">${listed.label}</h3>
                </div>

                <!-- 2-Column Layout -->
                <div style="display: flex; flex-wrap: wrap;">
                    
                    <!-- LEFT: Listed -->
                    <div style="flex: 1; min-width: 300px; border-right: 1px solid #334155;">
                        <div style="padding: 10px; background: #1e293b; border-bottom: 1px solid #334155; font-size: 0.9rem; font-weight: bold; color: #94a3b8; display: flex; justify-content: space-between;">
                            <span>CURRENTLY LISTED</span>
                            <span style="background: #334155; padding: 2px 8px; border-radius: 10px; color: #e2e8f0;">${listed.items.length}</span>
                        </div>
                        <div style="max-height: 300px; overflow-y: auto;">
                            <table style="margin: 0; box-shadow: none;">
                                <tbody>
                                    ${listed.items.length === 0 ? '<tr><td style="text-align:center; padding: 20px; color: #555;">No items listed.</td></tr>' : ''}
                                    ${listed.items.map(s => `
                                        <tr>
                                            <td style="padding: 8px 12px;">
                                                <div style="font-weight:500;">${s.name || s.typeLine}</div>
                                                <div style="font-size:0.8rem; color:#64748b;">${s.tabName}</div>
                                            </td>
                                            <td style="padding: 8px 12px; text-align:right;">
                                                <div class="price">${s.note || 'No Price'}</div>
                                                <div style="font-size:0.75rem; color:#64748b;"><span class="local-time-short" data-time="${s.lastSeen}">Time</span></div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- RIGHT: Sold -->
                    <div style="flex: 1; min-width: 300px;">
                        <div style="padding: 10px; background: #0f172a; border-bottom: 1px solid #334155; font-size: 0.9rem; font-weight: bold; color: #4ade80; display: flex; justify-content: space-between;">
                            <span>SOLD HISTORY</span>
                            <span style="background: rgba(74, 222, 128, 0.2); padding: 2px 8px; border-radius: 10px; color: #4ade80;">${sold.items.length}</span>
                        </div>
                        <div style="max-height: 300px; overflow-y: auto; background: #0f172a;">
                            <table style="margin: 0; box-shadow: none; background: #0f172a;">
                                <tbody>
                                    ${sold.items.length === 0 ? '<tr><td style="text-align:center; padding: 20px; color: #555;">No sales yet.</td></tr>' : ''}
                                    ${sold.items.map(s => `
                                        <tr>
                                            <td style="padding: 8px 12px;">
                                                <div style="font-weight:500;">${s.itemName}</div>
                                                <div style="font-size:0.8rem; color:#64748b;">${s.tabName}</div>
                                            </td>
                                            <td style="padding: 8px 12px; text-align:right;">
                                                <div class="price">${s.price}</div>
                                                <div style="font-size:0.75rem; color:#64748b;"><span class="local-time" data-time="${s.timestamp}">Time</span></div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        `;
    }).join('');

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
            <div style="margin-bottom: 20px; background: #0f172a; padding: 15px; border-radius: 6px; border: 1px solid #334155;">
                <h3 style="margin-top:0; font-size:1rem; color:#cbd5e1;">Add New Profile</h3>
                <form method="POST" action="/profiles/add">
                    <div style="display:flex; gap: 10px; margin-bottom: 10px;">
                        <input type="text" name="accountName" placeholder="Account Name (e.g. User#1234)" required style="width: 200px;">
                        <input type="text" name="league" placeholder="League" value="Fate of the Vaal" required style="width: 150px;">
                    </div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <input type="text" name="sessId_1" placeholder="Cookie #1 (Required)" required>
                        <input type="text" name="sessId_2" placeholder="Cookie #2 (Optional)">
                        <input type="text" name="sessId_3" placeholder="Cookie #3 (Optional)">
                    </div>

                    <button type="submit" style="width: 100%;">Add Profile</button>
                </form>
            </div>

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
                                <a href="/profiles/edit/${p.id}" class="button sync" style="background:#64748b; margin-right:5px; text-decoration:none; padding: 5px 10px; font-size: 0.8rem; display: inline-block;">Edit</a>
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

        <!-- Grouped Listings & Sales -->
        <h2>Tracking by Price Group</h2>
        <div style="display: flex; flex-direction: column;">
            ${groupsHtml}
        </div>
    `;
    return renderLayout('Trade Tracking', content, 'tracking');
}

// Old renderGroups function removed as it is integrated into renderTracking

