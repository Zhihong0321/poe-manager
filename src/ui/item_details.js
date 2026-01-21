import { renderLayout } from './layout.js';
export function renderItemDetails(item) {
    const data = typeof item.rawData === 'string' ? JSON.parse(item.rawData) : item.rawData;
    // Rarity Color Mapping
    const rarityMap = {
        0: '#c8c8c8', // Normal (White)
        1: '#8888ff', // Magic (Blue)
        2: '#ffff77', // Rare (Yellow)
        3: '#af6025', // Unique (Orange)
        9: '#ad8f61', // Relic/Foil?
    };
    const frameColor = rarityMap[data.frameType] || '#c8c8c8';
    // Header Style
    const headerStyle = `
        background: url('https://web.poecdn.com/image/layout/header-bg.png?1675899264') repeat-x center;
        background-size: contain;
        background-color: ${frameColor}; 
        color: #1e1e1e;
        padding: 10px;
        text-align: center;
        border: 1px solid ${frameColor};
        font-family: 'Fontin', serif; /* PoE font if available, fallback serif */
    `;
    // Properties parser
    const renderProperties = () => {
        if (!data.properties)
            return '';
        return data.properties.map((p) => {
            let valueStr = '';
            if (p.values && p.values.length > 0) {
                valueStr = p.values.map((v) => {
                    const val = v[0];
                    const type = v[1]; // 0=white, 1=blue (modified)
                    const color = type === 1 ? '#8888ff' : '#7f7f7f';
                    return `<span style="color:${color}">${val}</span>`;
                }).join(', ');
            }
            return `<div style="color:#7f7f7f;">${p.name}${valueStr ? ': ' + valueStr : ''}</div>`;
        }).join('');
    };
    const renderRequirements = () => {
        if (!data.requirements)
            return '';
        const reqs = data.requirements.map((r) => {
            return `${r.name} <span style="color:#fff">${r.values[0][0]}</span>`;
        }).join(', ');
        return `<div style="border-top: 1px solid #7f7f7f; margin-top: 5px; padding-top: 5px; color:#7f7f7f;">Requires ${reqs}</div>`;
    };
    const renderMods = (mods, color) => {
        if (!mods)
            return '';
        return `<div style="border-top: 1px solid #7f7f7f; margin-top: 5px; padding-top: 5px;">` +
            mods.map(m => `<div style="color:${color};">${m}</div>`).join('') +
            `</div>`;
    };
    const content = `
        <div style="max-width: 500px; margin: 0 auto;">
            <a href="/tracking" style="display:inline-block; margin-bottom: 20px; color: #cbd5e1; text-decoration: none;">&larr; Back to Tracking</a>
            
            <div class="item-card" style="background: #000; border: 2px solid ${frameColor}; color: #7f7f7f; font-family: sans-serif;">
                
                <!-- Header -->
                <div style="${headerStyle}">
                    <div style="font-size: 1.2rem; font-weight: bold;">${data.name || ''}</div>
                    <div style="font-size: 1.2rem; font-weight: bold;">${data.typeLine}</div>
                </div>

                <!-- Body -->
                <div style="padding: 10px;">
                    ${renderProperties()}
                    ${renderRequirements()}
                    
                    ${data.enchantMods ? renderMods(data.enchantMods, '#b4b4b4') : ''}
                    ${data.implicitMods ? renderMods(data.implicitMods, '#8888ff') : ''}
                    ${data.explicitMods ? renderMods(data.explicitMods, '#8888ff') : ''}
                    ${data.fracturedMods ? renderMods(data.fracturedMods, '#a29160') : ''}
                    ${data.craftedMods ? renderMods(data.craftedMods, '#b4b4b4') : ''}

                    ${data.corrupted ? '<div style="color:#d20000; text-align:center; margin-top:10px; font-weight:bold;">CORRUPTED</div>' : ''}
                </div>

                <!-- Footer / Tracking Info -->
                <div style="background: #1a1a1a; padding: 10px; border-top: 1px solid #333; color: #aaa; font-size: 0.9rem;">
                    <div><strong>Tab:</strong> ${item.tabName}</div>
                    <div><strong>Price:</strong> ${item.note || 'Unpriced'}</div>
                    <div><strong>Listed:</strong> ${new Date(item.indexedAt || item.lastSeen).toLocaleString()}</div>
                    <div><strong>Last Seen:</strong> ${new Date(item.lastSeen).toLocaleString()}</div>
                </div>

            </div>

            <!-- Raw Data Debug (Collapsible) -->
            <details style="margin-top: 30px; color: #555;">
                <summary>Raw JSON Data</summary>
                <pre style="background: #111; padding: 10px; overflow: auto;">${JSON.stringify(data, null, 2)}</pre>
            </details>
        </div>
    `;
    return renderLayout(`${data.name || data.typeLine} - Details`, content, 'tracking');
}
//# sourceMappingURL=item_details.js.map