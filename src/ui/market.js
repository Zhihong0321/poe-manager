import { renderLayout } from './layout.js';
import {} from '../db.js';
export function renderMarket(profiles, snapshotsByProfile) {
    const categories = [
        { label: 'Body Armour', value: 'armour.body' },
        { label: 'Boots', value: 'armour.boots' },
        { label: 'Gloves', value: 'armour.gloves' },
        { label: 'Helmet', value: 'armour.helmet' },
        { label: 'Bow', value: 'weapon.bow' },
        { label: 'Wand', value: 'weapon.wand' },
        { label: 'Ring', value: 'accessory.ring' },
        { label: 'Amulet', value: 'accessory.amulet' },
        { label: 'Belt', value: 'accessory.belt' }
    ];
    const content = `
        <div class="flex" style="justify-content: space-between; align-items: flex-end;">
            <h1>Market Watch</h1>
            <div style="margin-bottom: 10px;">
                <button onclick="document.getElementById('add-market-form').style.display='block'">+ Create Search Profile</button>
            </div>
        </div>

        <div id="add-market-form" class="box" style="display: none; border-left: 4px solid #facc15;">
            <h2>Create New Search Profile</h2>
            <form action="/market/profiles/add" method="POST">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <label>Profile Name</label><br>
                        <input type="text" name="name" placeholder="e.g. High Eva Body" required style="width: 100%;">
                    </div>
                    <div>
                        <label>League</label><br>
                        <input type="text" name="league" value="Standard" required style="width: 100%;">
                    </div>
                    <div>
                        <label>Category</label><br>
                        <select name="itemCategory" style="width: 100%;">
                            ${categories.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label>Sort By</label><br>
                        <select name="sortBy" style="width: 100%;">
                            <option value="evasion">Evasion</option>
                            <option value="armour">Armour</option>
                            <option value="es">Energy Shield</option>
                            <option value="dps">DPS</option>
                            <option value="phys_dps">Physical DPS</option>
                        </select>
                    </div>
                    <div>
                        <label>Interval (mins)</label><br>
                        <input type="number" name="intervalMin" value="60" style="width: 100%;">
                    </div>
                </div>

                <h3 style="margin-top: 20px; font-size: 0.9rem; color: #94a3b8;">Item Level & Requirements</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px;">
                    <input type="number" name="minIlvl" placeholder="Min iLvl">
                    <input type="number" name="maxIlvl" placeholder="Max iLvl">
                    <input type="number" name="minReqLevel" placeholder="Min Req Lvl">
                    <input type="number" name="maxReqLevel" placeholder="Max Req Lvl">
                    <input type="number" name="minQuality" placeholder="Min Quality">
                </div>

                <h3 style="margin-top: 20px; font-size: 0.9rem; color: #94a3b8;">Minimum Stats</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px;">
                    <input type="number" name="minEvasion" placeholder="Min Evasion">
                    <input type="number" name="minArmour" placeholder="Min Armour">
                    <input type="number" name="minEs" placeholder="Min ES">
                </div>

                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button type="submit">Save Profile</button>
                    <button type="button" class="danger" onclick="document.getElementById('add-market-form').style.display='none'">Cancel</button>
                </div>
            </form>
        </div>

        <div style="margin-top: 20px;">
            ${profiles.length === 0 ? '<p class="box">No market profiles created yet.</p>' : ''}
            
            ${profiles.map(profile => {
        const history = snapshotsByProfile[profile.id] || [];
        const latest = history[0];
        const items = latest ? latest.items_json : [];
        return `
                    <div class="box" style="padding: 0; overflow: hidden; border-top: 1px solid #334155; border-radius: 0;">
                        <div style="padding: 15px 20px; background: #1e293b; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;">
                            <div>
                                <span style="font-size: 1.2rem; font-weight: bold; color: #facc15;">${profile.name}</span>
                                <span style="color: #94a3b8; font-size: 0.8rem; margin-left: 10px;">
                                    ${profile.itemCategory} | Sort: ${profile.sortBy} | ${profile.league}
                                </span>
                            </div>
                            <div class="flex">
                                <span style="font-size: 0.8rem; color: #94a3b8;">Interval: ${profile.intervalMin}m | Last: ${profile.lastRun ? new Date(profile.lastRun).toLocaleTimeString() : 'Never'}</span>
                                <form action="/market/profiles/toggle" method="POST" style="display:inline;">
                                    <input type="hidden" name="id" value="${profile.id}">
                                    <input type="hidden" name="isActive" value="${!profile.isActive}">
                                    <button type="submit" class="toggle" style="padding: 5px 10px; font-size: 0.8rem;">
                                        ${profile.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                </form>
                                <form action="/market/profiles/delete" method="POST" style="display:inline;" onsubmit="return confirm('Delete this profile?')">
                                    <input type="hidden" name="id" value="${profile.id}">
                                    <button type="submit" class="danger" style="padding: 5px 10px; font-size: 0.8rem;">Delete</button>
                                </form>
                            </div>
                        </div>

                        <div style="display: flex; border-bottom: 1px solid #334155;">
                            <!-- History List -->
                            <div style="width: 200px; border-right: 1px solid #334155; background: #0f172a; max-height: 400px; overflow-y: auto;">
                                <div style="padding: 10px; font-size: 0.75rem; color: #64748b; font-weight: bold; text-transform: uppercase;">Recent Scans</div>
                                ${history.map((h, idx) => `
                                    <div style="padding: 10px 15px; font-size: 0.85rem; border-bottom: 1px solid #1e293b; cursor: pointer; ${idx === 0 ? 'background: #1e293b; color: #facc15;' : ''}"
                                         onclick="window.location.href='/market?profileId=${profile.id}&scanId=${h.id}'">
                                        ${new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        <span style="float: right; color: #4ade80;">$</span>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- Top 20 Results -->
                            <div style="flex-grow: 1; padding: 0;">
                                <table style="margin-top: 0; background: transparent; box-shadow: none; border-radius: 0;">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Item</th>
                                            <th>${profile.sortBy.toUpperCase()}</th>
                                            <th>Price</th>
                                            <th>Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${items.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #64748b;">No scan data yet. Wait for next interval or trigger manually.</td></tr>' : ''}
                                        ${items.map((item, idx) => {
            // Simple trend logic: compare with previous scan if available
            const prevScan = history[1];
            let trendHtml = '-';
            if (prevScan) {
                const prevItems = prevScan.items_json;
                const prevItem = prevItems[idx]; // compare by rank
                if (prevItem) {
                    const priceDiff = item.amount - prevItem.amount;
                    if (priceDiff > 0)
                        trendHtml = '<span style="color: #ef4444;">▲</span>';
                    else if (priceDiff < 0)
                        trendHtml = '<span style="color: #4ade80;">▼</span>';
                }
            }
            return `
                                                <tr>
                                                    <td style="width: 30px; color: #64748b;">${idx + 1}</td>
                                                    <td>
                                                        <div style="font-weight: bold;">${item.name || item.typeLine}</div>
                                                        <div style="font-size: 0.75rem; color: #94a3b8;">${item.name ? item.typeLine : ''}</div>
                                                    </td>
                                                    <td style="font-family: monospace; color: #facc15; font-size: 1.1rem;">${item.sortValue}</td>
                                                    <td class="price">${item.price}</td>
                                                    <td style="text-align: center;">${trendHtml}</td>
                                                </tr>
                                            `;
        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
    return renderLayout('Market Watch', content, 'market');
}
//# sourceMappingURL=market.js.map