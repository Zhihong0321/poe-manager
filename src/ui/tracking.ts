import { renderLayout } from './layout.js';

function formatDuration(isoString: string | null): string {
    if (!isoString) return 'New';
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now.getTime() - then.getTime();
    
    if (diffMs < 0) return 'Just now'; 
    
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
}

export function parsePrice(note: string): { value: number, currency: 'c' | 'd' | 'ex' | 'unknown' } {
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
        g1: { label: '0 ~ 100 Chaos', items: [] as any[], color: '#94a3b8', currency: 'chaos', min: 0, max: 100 },
        g2: { label: '100 ~ 300 Chaos', items: [] as any[], color: '#cbd5e1', currency: 'chaos', min: 101, max: 300 },
        g3: { label: '300 ~ 800 Chaos', items: [] as any[], color: '#e2e8f0', currency: 'chaos', min: 301, max: 800 },
        
        gEx1: { label: '0 ~ 20 Exalted', items: [] as any[], color: '#fdba74', currency: 'ex', min: 0, max: 20 }, 
        gEx2: { label: '20 ~ 100 Exalted', items: [] as any[], color: '#fb923c', currency: 'ex', min: 21, max: 100 },
        gEx3: { label: '100 ~ 200 Exalted', items: [] as any[], color: '#ea580c', currency: 'ex', min: 101, max: 200 },
        gEx4: { label: '200+ Exalted', items: [] as any[], color: '#991b1b', currency: 'ex', min: 201, max: undefined },

        g4: { label: '1D ~ 2D', items: [] as any[], color: '#facc15', currency: 'd', min: 0, max: 2.9 },
        g5: { label: '3D ~ 5D', items: [] as any[], color: '#f59e0b', currency: 'd', min: 3, max: 5 },
        g6: { label: '6D ~ 10D', items: [] as any[], color: '#d97706', currency: 'd', min: 6, max: 10 },
        g7: { label: '11D ~ 25D', items: [] as any[], color: '#b45309', currency: 'd', min: 11, max: 25 },
        g8: { label: '26D and above', items: [] as any[], color: '#ef4444', currency: 'd', min: 26, max: undefined },
        
        g9: { label: 'Unpriced / Other', items: [] as any[], color: '#64748b', currency: 'unknown', min: undefined, max: undefined }
    };

    items.forEach(s => {
        const priceStr = s.note || s.price || '';
        const { value, currency } = parsePrice(priceStr);
        
        if (currency === 'c') {
            if (value < 100) groups.g1.items.push(s);
            else if (value < 300) groups.g2.items.push(s);
            else if (value <= 800) groups.g3.items.push(s);
            else groups.g9.items.push(s);
        } else if (currency === 'ex') {
            if (value < 20) groups.gEx1.items.push(s);
            else if (value < 100) groups.gEx2.items.push(s);
            else if (value < 200) groups.gEx3.items.push(s);
            else groups.gEx4.items.push(s);
        } else if (currency === 'd') {
            if (value < 3) groups.g4.items.push(s);
            else if (value < 6) groups.g5.items.push(s);
            else if (value < 11) groups.g6.items.push(s);
            else if (value < 26) groups.g7.items.push(s);
            else groups.g8.items.push(s);
        } else {
            groups.g9.items.push(s);
        }
    });
    
    return groups;
}


export function renderTracking(sales: any[], interval: string, profiles: any[], snapshots: any[], syncStats: Record<number, any[]> = {}) {
    const now = new Date();
    
    // Filter out sales older than 500 minutes
    const recentSales = sales.filter(s => {
        const diffMs = now.getTime() - new Date(s.timestamp).getTime();
        return diffMs < (500 * 60 * 1000);
    });

    // 1. Bucket the items
    const listedGroups = bucketItems(snapshots);
    const soldGroups = bucketItems(recentSales);

    // 2. Generate content for groups
    const groupKeys = Object.keys(listedGroups) as Array<keyof typeof listedGroups>;
    
    const groupsHtml = groupKeys.map(key => {
        const listed = listedGroups[key];
        const sold = soldGroups[key];
        
        if (listed.items.length === 0 && sold.items.length === 0) return '';

        return `
            <div style="margin-bottom: 0; border-left: 4px solid ${listed.color}; border-bottom: 1px solid #334155; background: #1e293b;">
                <!-- Header -->
                <div style="padding: 12px 20px; background: rgba(0,0,0,0.3); border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: ${listed.color}; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">${listed.label}</h3>
                    
                    ${listed.currency !== 'unknown' ? `
                        <form method="POST" action="/tracking/refresh-group">
                            <input type="hidden" name="currency" value="${listed.currency}">
                            <input type="hidden" name="min" value="${listed.min}">
                            <input type="hidden" name="max" value="${listed.max}">
                            <button type="submit" style="padding: 4px 12px; font-size: 0.65rem; background: transparent; border: 1px solid ${listed.color}; color: ${listed.color}; border-radius: 2px;">Refresh Group</button>
                        </form>
                    ` : ''}
                </div>

                <!-- 2-Column Layout -->
                <div style="display: flex; flex-wrap: wrap;">
                    
                    <!-- LEFT: Listed -->
                    <div style="flex: 1; min-width: 300px; border-right: 1px solid #334155;">
                        <div style="padding: 8px 20px; background: rgba(0,0,0,0.15); border-bottom: 1px solid #334155; font-size: 0.75rem; font-weight: bold; color: #94a3b8; display: flex; justify-content: space-between;">
                            <span>CURRENTLY LISTED</span>
                            <span style="color: #e2e8f0;">${listed.items.length}</span>
                        </div>
                        <div>
                            <table style="margin: 0; border: none; background: transparent;">
                                <tbody>
                                    ${listed.items.length === 0 ? '<tr><td style="text-align:center; padding: 20px; color: #475569; font-size: 0.85rem;">No items listed.</td></tr>' : ''}
                                    ${listed.items.map(s => `
                                        <tr>
                                            <td style="padding: 10px 20px;">
                                                <div style="font-weight:500;">
                                                    <a href="/item/${s.id}" style="color: #f1f5f9; text-decoration: none; border-bottom: 1px dashed #475569;">${s.name || s.typeLine}</a>
                                                </div>
                                                <div style="font-size:0.75rem; color:#64748b; margin-top: 2px;">${s.tabName}</div>
                                            </td>
                                            <td style="padding: 10px 20px; text-align:right;">
                                                <div class="price">${s.note || 'No Price'}</div>
                                                <div style="font-size:0.7rem; color:#475569; margin-top: 2px;">${formatDuration(s.indexedAt)}</div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- RIGHT: Sold -->
                    <div style="flex: 1; min-width: 300px;">
                        <div style="padding: 8px 20px; background: rgba(0,0,0,0.25); border-bottom: 1px solid #334155; font-size: 0.75rem; font-weight: bold; color: #4ade80; display: flex; justify-content: space-between;">
                            <span>SOLD HISTORY</span>
                            <span style="color: #4ade80;">${sold.items.length}</span>
                        </div>
                        <div style="background: rgba(0,0,0,0.1);">
                            <table style="margin: 0; border: none; background: transparent;">
                                <tbody>
                                    ${sold.items.length === 0 ? '<tr><td style="text-align:center; padding: 20px; color: #475569; font-size: 0.85rem;">No sales yet.</td></tr>' : ''}
                                    ${sold.items.map(s => {
                                        const minutesAgo = Math.floor((now.getTime() - new Date(s.timestamp).getTime()) / 60000);
                                        const opacity = Math.max(0, (100 - (minutesAgo / 5))) / 100;
                                        return `
                                        <tr style="opacity: ${opacity};">
                                            <td style="padding: 10px 20px;">
                                                <div style="font-weight:500; color: #cbd5e1;">${s.itemName}</div>
                                                <div style="font-size:0.75rem; color:#64748b; margin-top: 2px;">${s.tabName}</div>
                                            </td>
                                            <td style="padding: 10px 20px; text-align:right;">
                                                <div class="price">${s.price}</div>
                                                <div style="font-size:0.7rem; color:#475569; margin-top: 2px;"><span class="local-time-short" data-time="${s.timestamp}">Time</span></div>
                                            </td>
                                        </tr>
                                    `}).join('')}
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
        <div class="box flex" style="justify-content: space-between; background: #1e293b;">
            <form method="POST" action="/settings" class="flex" style="flex-grow: 1;">
                <label style="font-size: 0.9rem; color: #94a3b8;">Scan Interval (min):</label>
                <div class="flex" style="flex-wrap: nowrap; gap: 5px;">
                    <input type="number" name="interval" value="${interval}" min="1" style="width: 70px; padding: 8px;">
                    <button type="submit" style="padding: 8px 15px;">Save</button>
                </div>
            </form>
            <div class="flex" style="justify-content: flex-end; gap: 10px;">
                 <form method="POST" action="/tracking/refresh">
                    <button type="submit" style="background: #3b82f6; color: white; padding: 8px 15px;">Refresh All</button>
                 </form>
                 <form method="POST" action="/tracking/clear" onsubmit="return confirm('Wipe ALL data?');">
                    <button type="submit" class="danger" style="padding: 8px 15px;">Clear</button>
                 </form>
            </div>
        </div>

        <!-- Profiles -->
        <h2>Tracking Profiles</h2>
        <div style="background: #1e293b; border: 1px solid #334155; border-bottom: none;">
            <div style="padding: 20px; background: rgba(0,0,0,0.2); border-bottom: 1px solid #334155;">
                <h3 style="margin-top:0; font-size:1rem; color:#facc15; text-transform: uppercase; letter-spacing: 1px;">Add New Profile</h3>
                <form method="POST" action="/profiles/add">
                    <div class="flex" style="margin-bottom: 15px;">
                        <input type="text" name="accountName" placeholder="Account Name (User#1234)" required style="flex: 2; min-width: 200px;">
                        <input type="text" name="league" placeholder="League" value="Fate of the Vaal" required style="flex: 1; min-width: 150px;">
                    </div>
                    
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
                        <input type="text" name="sessId_1" placeholder="POESESSID (Required)" required style="flex: 1; min-width: 250px;">
                        <input type="text" name="sessId_2" placeholder="POESESSID (Optional)" style="flex: 1; min-width: 250px;">
                        <input type="text" name="sessId_3" placeholder="POESESSID (Optional)" style="flex: 1; min-width: 250px;">
                    </div>

                    <button type="submit" style="width: 100%; letter-spacing: 2px;">Add Profile</button>
                </form>
            </div>

            <div class="table-container" style="border: none;">
                <table style="min-width: 600px; background: transparent;">
                    <thead>
                        <tr>
                            <th>Account</th>
                            <th>League</th>
                            <th>Status</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${profiles.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 30px; color: #475569;">No profiles. Add one to start tracking.</td></tr>' : ''}
                        ${profiles.map(p => `
                            <tr>
                                <td><span style="font-weight: bold; color: #f1f5f9;">${p.accountName}</span></td>
                                <td style="color: #94a3b8;">${p.league}</td>
                                <td><span class="${p.isActive ? 'status-active' : 'status-inactive'}">${p.isActive ? 'ACTIVE' : 'PAUSED'}</span></td>
                                <td style="border:none; padding: 10px;">
                                    <div class="flex" style="justify-content: flex-end; gap: 5px; flex-wrap: nowrap;">
                                        <a href="/profiles/edit/${p.id}" class="button" style="background:#475569; color: white; text-decoration:none; padding: 6px 10px; font-size: 0.75rem; border-radius: 2px;">Edit</a>
                                        <form method="POST" action="/profiles/sync">
                                            <input type="hidden" name="id" value="${p.id}">
                                            <button type="submit" class="sync" title="Sync Now" style="padding: 6px 10px; font-size: 0.75rem; border-radius: 2px;">Sync</button>
                                        </form>
                                        <form method="POST" action="/profiles/toggle">
                                            <input type="hidden" name="id" value="${p.id}">
                                            <input type="hidden" name="isActive" value="${!p.isActive}">
                                            <button type="submit" class="toggle" style="padding: 6px 10px; font-size: 0.75rem; border-radius: 2px;">${p.isActive ? 'Pause' : 'Resume'}</button>
                                        </form>
                                        <form method="POST" action="/profiles/delete" onsubmit="return confirm('Delete?');">
                                            <input type="hidden" name="id" value="${p.id}">
                                            <button type="submit" class="danger" style="padding: 6px 10px; font-size: 0.75rem; border-radius: 2px;">X</button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                            ${(syncStats[p.id] && (syncStats[p.id] as any[]).length > 0) ? `
                            <tr style="background: rgba(0,0,0,0.1);">
                                <td colspan="4" style="padding: 10px 20px;">
                                    <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Category Refresh Status</div>
                                    <div class="flex" style="gap: 10px; justify-content: flex-start;">
                                        ${(syncStats[p.id] as any[]).map((s: any) => `
                                            <div style="background: #0f172a; padding: 4px 8px; border-radius: 4px; border: 1px solid #334155; font-size: 0.7rem;">
                                                <span style="color: #facc15; font-weight: bold;">${s.category}:</span> 
                                                <span style="color: #e2e8f0;">${s.itemCount}</span>
                                                <span style="color: #475569; margin-left: 5px;">${formatDuration(s.lastSync)} ago</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </td>
                            </tr>
                            ` : ''}
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Grouped Listings & Sales -->
        <h2 style="margin-top: 40px;">Tracking by Price Group</h2>
        <div style="display: flex; flex-direction: column; border: 1px solid #334155; border-bottom: none;">
            ${groupsHtml}
        </div>
    `;
    return renderLayout('Trade Tracking', content, 'tracking');
}