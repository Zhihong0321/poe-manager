import { getMarketProfiles, updateMarketProfileLastRun, saveMarketSnapshot, getActiveProfiles, type MarketProfile, getProfiles } from './db.js';
import { searchTrade, fetchItemDetails } from './api.js';

export async function runMarketScans() {
    const allProfiles = await getMarketProfiles();
    const activeProfiles = allProfiles.filter(p => p.isActive);

    for (const profile of activeProfiles) {
        const now = new Date();
        const lastRun = profile.lastRun ? new Date(profile.lastRun) : new Date(0);
        const diffMs = now.getTime() - lastRun.getTime();
        const intervalMs = profile.intervalMin * 60 * 1000;

        if (diffMs >= intervalMs) {
            console.log(`[Market] Running scan for profile: ${profile.name}`);
            await executeMarketScan(profile);
            await updateMarketProfileLastRun(profile.id);
        }
    }
}

export async function executeMarketScan(profile: MarketProfile) {
    // We need a session ID. We'll grab the first active tracking profile's sessId 
    // or the user can provide one. For now, we'll try to find any valid sessId.
    const trackingProfiles = await import('./db.js').then(m => m.getActiveProfiles());
    const firstProfile = trackingProfiles[0];
    if (!firstProfile) {
        console.error("No active tracking profiles found to provide POESESSID for market search.");
        return;
    }
    const sessId = firstProfile.sessId;

    const query = buildQuery(profile);
    const searchResult = await searchTrade(profile.league, query, sessId);

    if (searchResult && searchResult.result.length > 0) {
        // Fetch details for top items (up to 40 to handle local sorting if needed)
        const topIds = searchResult.result.slice(0, 40);
        const items = await fetchItemDetails(topIds, sessId);

        const processedItems = items.map(i => processItemData(i, profile.sortBy));
        
        // Sort locally to ensure accuracy (especially for DPS)
        processedItems.sort((a, b) => b.sortValue - a.sortValue);

        // Keep Top 20
        const top20 = processedItems.slice(0, 20).map(i => ({
            name: i.name,
            typeLine: i.typeLine,
            sortValue: i.sortValue,
            price: i.price,
            currency: i.currency,
            amount: i.amount
        }));

        await saveMarketSnapshot(profile.id, top20);
        console.log(`[Market] Saved 20 items for ${profile.name}`);
    }
}

function buildQuery(profile: MarketProfile) {
    const query: any = {
        status: { option: "online" },
        filters: {
            type_filters: { filters: {} },
            equipment_filters: { filters: {} },
            misc_filters: { filters: {} }
        }
    };

    if (profile.itemCategory) {
        query.filters.type_filters.filters.category = { option: profile.itemCategory };
    }

    if (profile.minIlvl || profile.maxIlvl) {
        query.filters.equipment_filters.filters.ilvl = {};
        if (profile.minIlvl) query.filters.equipment_filters.filters.ilvl.min = profile.minIlvl;
        if (profile.maxIlvl) query.filters.equipment_filters.filters.ilvl.max = profile.maxIlvl;
    }

    if (profile.minReqLevel || profile.maxReqLevel) {
        query.filters.equipment_filters.filters.level = {};
        if (profile.minReqLevel) query.filters.equipment_filters.filters.level.min = profile.minReqLevel;
        if (profile.maxReqLevel) query.filters.equipment_filters.filters.level.max = profile.maxReqLevel;
    }

    if (profile.minQuality) {
        query.filters.misc_filters.filters.quality = { min: profile.minQuality };
    }

    if (profile.minEvasion) query.filters.equipment_filters.filters.ev = { min: profile.minEvasion };
    if (profile.minArmour) query.filters.equipment_filters.filters.ar = { min: profile.minArmour };
    if (profile.minEs) query.filters.equipment_filters.filters.es = { min: profile.minEs };

    const sortMap: any = {
        'evasion': { 'evasion': 'desc' },
        'armour': { 'armour': 'desc' },
        'es': { 'es': 'desc' },
        'dps': { 'dps': 'desc' },
        'phys_dps': { 'pdps': 'desc' }
    };

    return {
        query,
        sort: sortMap[profile.sortBy] || { 'price': 'asc' }
    };
}

function processItemData(itemResult: any, sortBy: string) {
    const item = itemResult.item;
    const listing = itemResult.listing;

    let sortValue = 0;
    if (sortBy === 'evasion') sortValue = getStatValue(item, 'Evasion Rating');
    else if (sortBy === 'armour') sortValue = getStatValue(item, 'Armour');
    else if (sortBy === 'es') sortValue = getStatValue(item, 'Energy Shield');
    else if (sortBy === 'dps' || sortBy === 'phys_dps') {
        sortValue = calculateDPS(item, sortBy === 'phys_dps');
    }

    return {
        name: item.name || '',
        typeLine: item.typeLine,
        sortValue,
        price: `${listing.price.amount} ${listing.price.currency}`,
        amount: listing.price.amount,
        currency: listing.price.currency
    };
}

function getStatValue(item: any, label: string): number {
    if (!item.properties) return 0;
    const prop = item.properties.find((p: any) => p.name === label);
    if (!prop) return 0;
    return parseInt(prop.values[0][0].replace(/[^0-9]/g, ''), 10);
}

function calculateDPS(item: any, physicalOnly: boolean): number {
    if (!item.properties) return 0;
    
    const physDamage = item.properties.find((p: any) => p.name === 'Physical Damage');
    const apsProp = item.properties.find((p: any) => p.name === 'Attacks per Second');
    
    if (!apsProp) return 0;
    const aps = parseFloat(apsProp.values[0][0]);
    
    let totalDps = 0;

    if (physDamage) {
        const [min, max] = physDamage.values[0][0].split('-').map((v: string) => parseInt(v.replace(/[^0-9]/g, ''), 10));
        totalDps += ((min + max) / 2) * aps;
    }

    if (!physicalOnly) {
        const elemDamage = item.properties.find((p: any) => p.name === 'Elemental Damage');
        if (elemDamage) {
            // Elemental damage can have multiple ranges
            for (const val of elemDamage.values) {
                const [min, max] = val[0].split('-').map((v: string) => parseInt(v.replace(/[^0-9]/g, ''), 10));
                totalDps += ((min + max) / 2) * aps;
            }
        }
    }

    return Math.round(totalDps * 10) / 10;
}
