import { renderLayout } from './layout.js';
import { type MarketProfile } from '../db.js';

export function renderMarket(profiles: MarketProfile[], snapshotsByProfile: Record<number, any[]>) {
    const categories = [
        { label: 'Body Armour', value: 'armour.chest' },
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
        <div class="flex" style="justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h1 style="margin: 0; border: none;">Market Watch</h1>
            <button onclick="openCreateForm()" style="white-space: nowrap; letter-spacing: 1px;">+ New Profile</button>
        </div>

        <div id="add-market-form" style="display: none; border-left: 4px solid #facc15; background: #1e293b; border-bottom: 1px solid #334155; padding: 25px;">
            <h2 id="form-title" style="margin-top: 0; color: #facc15;">Create New Search Profile</h2>
            <form id="market-form" action="/market/profiles/add" method="POST">
                <input type="hidden" name="id" id="form-id">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div>
                        <label style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Profile Name</label>
                        <input type="text" name="name" id="form-name" placeholder="e.g. High Eva Body" required style="width: 100%; margin-top: 5px;">
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">League</label>
                        <input type="text" name="league" id="form-league" value="Standard" required style="width: 100%; margin-top: 5px;">
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Category</label>
                        <select name="itemCategory" id="form-category" style="width: 100%; margin-top: 5px;">
                            ${categories.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Sort By</label>
                        <select name="sortBy" id="form-sort" style="width: 100%; margin-top: 5px;">
                            <option value="evasion">Evasion</option>
                            <option value="armour">Armour</option>
                            <option value="es">Energy Shield</option>
                            <option value="dps">DPS</option>
                            <option value="phys_dps">Physical DPS</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Interval (min)</label>
                        <input type="number" name="intervalMin" id="form-interval" value="60" style="width: 100%; margin-top: 5px;">
                    </div>
                </div>

                <h3 style="margin-top: 30px; font-size: 0.9rem; color: #facc15; text-transform: uppercase; border-bottom: 1px solid #334155; padding-bottom: 5px;">Requirements</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-top: 10px;">
                    <input type="number" name="minIlvl" id="form-minIlvl" placeholder="Min iLvl">
                    <input type="number" name="maxIlvl" id="form-maxIlvl" placeholder="Max iLvl">
                    <input type="number" name="minReqLevel" id="form-minReqLevel" placeholder="Min Req Lvl">
                    <input type="number" name="maxReqLevel" id="form-maxReqLevel" placeholder="Max Req Lvl">
                    <input type="number" name="minQuality" id="form-minQuality" placeholder="Min Quality">
                </div>

                <h3 style="margin-top: 30px; font-size: 0.9rem; color: #facc15; text-transform: uppercase; border-bottom: 1px solid #334155; padding-bottom: 5px;">Minimum Stats</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-top: 10px;">
                    <input type="number" name="minEvasion" id="form-minEvasion" placeholder="Min Evasion">
                    <input type="number" name="minArmour" id="form-minArmour" placeholder="Min Armour">
                    <input type="number" name="minEs" id="form-minEs" placeholder="Min ES">
                </div>

                <div style="margin-top: 40px; display: flex; gap: 15px; flex-wrap: wrap;">
                    <button type="submit" id="form-submit" style="flex: 1; min-width: 150px;">Save Profile</button>
                    <button type="button" class="danger" onclick="document.getElementById('add-market-form').style.display='none'" style="flex: 1; min-width: 150px;">Cancel</button>
                </div>
            </form>
        </div>

        <script>
            function openCreateForm() {
                document.getElementById('add-market-form').style.display = 'block';
                document.getElementById('form-title').textContent = 'Create New Search Profile';
                document.getElementById('market-form').action = '/market/profiles/add';
                document.getElementById('form-submit').textContent = 'Save Profile';
                
                // Reset fields
                document.getElementById('form-id').value = '';
                document.getElementById('form-name').value = '';
                document.getElementById('form-league').value = 'Standard';
                document.getElementById('form-category').selectedIndex = 0;
                document.getElementById('form-sort').selectedIndex = 0;
                document.getElementById('form-interval').value = '60';
                
                // Reset optionals
                ['minIlvl', 'maxIlvl', 'minReqLevel', 'maxReqLevel', 'minQuality', 'minEvasion', 'minArmour', 'minEs']
                    .forEach(id => document.getElementById('form-' + id).value = '');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            function editProfile(profile) {
                document.getElementById('add-market-form').style.display = 'block';
                document.getElementById('form-title').textContent = 'Edit Search Profile';
                document.getElementById('market-form').action = '/market/profiles/update';
                document.getElementById('form-submit').textContent = 'Update Profile';
                
                document.getElementById('form-id').value = profile.id;
                document.getElementById('form-name').value = profile.name;
                document.getElementById('form-league').value = profile.league;
                document.getElementById('form-category').value = profile.itemCategory;
                document.getElementById('form-sort').value = profile.sortBy;
                document.getElementById('form-interval').value = profile.intervalMin;
                
                document.getElementById('form-minIlvl').value = profile.minIlvl || '';
                document.getElementById('form-maxIlvl').value = profile.maxIlvl || '';
                document.getElementById('form-minReqLevel').value = profile.minReqLevel || '';
                document.getElementById('form-maxReqLevel').value = profile.maxReqLevel || '';
                document.getElementById('form-minQuality').value = profile.minQuality || '';
                document.getElementById('form-minEvasion').value = profile.minEvasion || '';
                document.getElementById('form-minArmour').value = profile.minArmour || '';
                document.getElementById('form-minEs').value = profile.minEs || '';
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        </script>

        <div style="margin-top: 0; border: 1px solid #334155; border-bottom: none;">
            ${profiles.length === 0 ? '<div style="padding: 40px; text-align: center; color: #475569; background: #1e293b; border-bottom: 1px solid #334155;">No market profiles.</div>' : ''}
            
            ${profiles.map(profile => {
                const history = snapshotsByProfile[profile.id] || [];
                const latest = history[0];
                const items = latest ? (latest.items_json as any[]) : [];
                
                return `
                    <div style="background: #1e293b; border-bottom: 1px solid #334155; overflow: hidden;">
                        <div style="padding: 15px 20px; background: rgba(0,0,0,0.2); border-bottom: 1px solid #334155;">
                            <div class="flex" style="justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <div style="font-size: 1.1rem; font-weight: bold; color: #facc15; text-transform: uppercase; letter-spacing: 1px;">${profile.name}</div>
                                    <div style="color: #94a3b8; font-size: 0.75rem; margin-top: 4px;">
                                        ${profile.itemCategory} | Sort: ${profile.sortBy} | ${profile.league}
                                    </div>
                                </div>
                                <div class="flex" style="justify-content: flex-end; gap: 5px;">
                                    <button type="button" onclick='editProfile(${JSON.stringify(profile)})' style="padding: 6px 10px; font-size: 0.7rem; background: #475569;">Edit</button>
                                    <form action="/market/profiles/toggle" method="POST" style="display:inline;">
                                        <input type="hidden" name="id" value="${profile.id}">
                                        <input type="hidden" name="isActive" value="${!profile.isActive}">
                                        <button type="submit" class="toggle" style="padding: 6px 10px; font-size: 0.7rem;">
                                            ${profile.isActive ? 'Pause' : 'Start'}
                                        </button>
                                    </form>
                                    <form action="/market/profiles/sync" method="POST" style="display:inline;">
                                        <input type="hidden" name="id" value="${profile.id}">
                                        <button type="submit" style="padding: 6px 10px; font-size: 0.7rem; background: #3b82f6;">
                                            Scan
                                        </button>
                                    </form>
                                    <form action="/market/profiles/delete" method="POST" style="display:inline;" onsubmit="return confirm('Delete?')">
                                        <input type="hidden" name="id" value="${profile.id}">
                                        <button type="submit" class="danger" style="padding: 6px 10px; font-size: 0.7rem;">X</button>
                                    </form>
                                </div>
                            </div>
                            <div style="margin-top: 10px; font-size: 0.7rem; color: #475569; text-transform: uppercase; letter-spacing: 1px;">
                                Every ${profile.intervalMin}m | Last: ${profile.lastRun ? `<span class="local-time" data-time="${profile.lastRun}">...</span>` : 'Never'}
                            </div>
                        </div>

                        <div style="display: flex; flex-wrap: wrap;">
                            <!-- History List -->
                            <div style="flex: 1; min-width: 160px; border-right: 1px solid #334155; background: rgba(0,0,0,0.1);">
                                <div style="padding: 8px 15px; font-size: 0.7rem; color: #64748b; font-weight: bold; text-transform: uppercase; background: rgba(0,0,0,0.1); border-bottom: 1px solid #334155;">Recent Scans</div>
                                <div style="max-height: 400px; overflow-y: auto;">
                                    ${history.map((h, idx) => `
                                        <div style="padding: 12px 15px; font-size: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; ${idx === 0 ? 'background: rgba(250, 204, 21, 0.1); color: #facc15; border-left: 3px solid #facc15;' : 'color: #94a3b8;'}"
                                             onclick="window.location.href='/market?profileId=${profile.id}&scanId=${h.id}'">
                                            <span class="local-time-short" data-time="${h.timestamp}">...</span>
                                            <span style="float: right; color: #4ade80; opacity: 0.7;">$</span>
                                        </div>
                                    `).join('')}
                                    ${history.length === 0 ? '<div style="padding: 20px; text-align: center; color: #475569; font-size: 0.75rem;">None</div>' : ''}
                                </div>
                            </div>

                            <!-- Top 20 Results -->
                            <div style="flex: 5; min-width: 300px;">
                                <div class="table-container" style="border: none;">
                                    <table style="margin-top: 0; background: transparent; border: none; min-width: 500px;">
                                        <thead>
                                            <tr>
                                                <th style="width: 30px; text-align: center;">#</th>
                                                <th>Item Name</th>
                                                <th style="text-align: right;">${profile.sortBy.toUpperCase()}</th>
                                                <th style="text-align: right;">Price</th>
                                                <th style="width: 50px; text-align: center;">±</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${items.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding: 60px; color: #475569; font-size: 0.9rem;">No data available.</td></tr>' : ''}
                                            ${items.map((item, idx) => {
                                                const prevScan = history[1];
                                                let trendHtml = '<span style="color: #475569;">-</span>';
                                                if (prevScan) {
                                                    const prevItems = prevScan.items_json as any[];
                                                    const prevItem = prevItems[idx];
                                                    if (prevItem) {
                                                        const priceDiff = item.amount - prevItem.amount;
                                                        if (priceDiff > 0) trendHtml = '<span style="color: #ef4444;">▲</span>';
                                                        else if (priceDiff < 0) trendHtml = '<span style="color: #4ade80;">▼</span>';
                                                    }
                                                }

                                                return `
                                                    <tr>
                                                        <td style="color: #475569; font-size: 0.75rem; text-align: center;">${idx + 1}</td>
                                                        <td>
                                                            <div style="font-weight: 500; font-size: 0.9rem; color: #f1f5f9;">${item.name || item.typeLine}</div>
                                                            <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">${item.name ? item.typeLine : ''}</div>
                                                        </td>
                                                        <td style="font-family: monospace; color: #facc15; font-size: 1rem; text-align: right; font-weight: bold;">${item.sortValue}</td>
                                                        <td class="price" style="text-align: right;">${item.price}</td>
                                                        <td style="text-align: center; font-size: 1rem;">${trendHtml}</td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    return renderLayout('Market Watch', content, 'market');
}
