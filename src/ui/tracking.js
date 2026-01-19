import { renderLayout } from './layout.js';
export function renderTracking(sales, interval, profiles, snapshots) {
    const content = `
        <h1>Trade Tracking</h1>

        <!-- Global Settings -->
        <div class="box flex" style="justify-content: space-between;">
            <form method="POST" action="/settings" class="flex">
                <label>Scan Interval (min):</label>
                <input type="number" name="interval" value="${interval}" min="1" style="width: 60px;">
                <button type="submit">Save</button>
            </form>
            <div>
                 <span style="color: #64748b; font-size: 0.9rem;">Auto-refreshing in background</span>
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

        <!-- Current Listings -->
        <h2>Current Trade Listings (${snapshots.length})</h2>
        <div style="max-height: 400px; overflow-y: auto; background: #1e293b; border-radius: 8px; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);">
            <table style="margin-top: 0; box-shadow: none;">
                <thead style="position: sticky; top: 0; z-index: 10;">
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
                            <td style="color:#64748b; font-size:0.8rem;">${new Date(s.lastSeen).toLocaleTimeString()}</td>
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
                        <td style="color: #94a3b8;">${new Date(sale.timestamp).toLocaleString()}</td>
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
//# sourceMappingURL=tracking.js.map