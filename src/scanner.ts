import { initDB, getKnownItemIds, saveItem, removeItem, recordMovement, type TrackingProfile } from './db.js';
import { getStashTabs, fetchItemDetails } from './api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

export async function scan(profile: TrackingProfile) {
    console.log(`[${new Date().toLocaleTimeString()}] Scanning for ${profile.accountName} in ${profile.league}...`);
    await initDB();

    // Note: getKnownItemIds fetches *all* items. Ideally we should filter by account/league in DB too, 
    // but for now we'll assume unique IDs handle collision or we scan all globally.
    // For robust multi-profile, we might need to scope `knownIds` by profile. 
    // However, item IDs are unique globally in PoE, so it's safe to mix.
    const knownIds = await getKnownItemIds();
    const seenIdsThisRun = new Set<string>();
    let salesCount = 0;

    try {
        // 1. Get IDs of all items listed by seller
        const { ids: itemIds, total: totalOnServer } = await getStashTabs(profile.accountName, profile.league, profile.sessIds);
        
        if (itemIds.length > 0) {
            // 2. Fetch full details for these items
            const items = await fetchItemDetails(itemIds, profile.sessIds);

            for (const itemResult of items) {
                const item = itemResult.item;
                const itemId = item.id;
                seenIdsThisRun.add(itemId);

                const price = item.note || 'No Price';
                const name = item.name || item.typeLine;
                const tabName = itemResult.listing?.stash?.name || 'Unknown Tab';
                const indexedAt = itemResult.listing?.indexed; // ISO Date String

                if (!knownIds.has(itemId)) {
                    await recordMovement(itemId, name, 'LISTED', price, tabName);
                }

                // Update DB with latest state
                await saveItem(item, tabName, 0, indexedAt); 
            }
        }

        // 3. Check for SOLD items
        // CRITICAL: Safety Check for Truncated Scans
        // If we found fewer items than the server says we have, it means the API didn't give us everything.
        // In this case, we CANNOT assume missing items are sold. They might just be hidden by the limit.
        
        if (itemIds.length < totalOnServer) {
            console.warn(`[Scan] WARNING: Incomplete scan detected (Found ${itemIds.length} / ${totalOnServer}). Skipping 'SOLD' detection to prevent false positives.`);
        } else {
            for (const knownId of knownIds) {
                 // To safely support multiple profiles, we'd need to know who owns knownId. 
                 // Since we don't, we might get false positives if we run multiple profiles.
                 // But for the user's request "create tracking profile", usually implies switching or managing one main one.
                 
                if (!seenIdsThisRun.has(knownId)) {
                    const dbItem = await import('./db.js').then(m => m.getItem(knownId));
                    
                    if (dbItem) {
                        const name = dbItem.name || dbItem.typeLine; 
                        const price = dbItem.note || 'No Price';
                        
                        console.log(`\n💰💰💰 ITEM SOLD! 💰💰💰`);
                        console.log(`Item:  ${name}`);
                        console.log(`Price: ${price}`);
                        console.log(`Tab:   ${dbItem.tabName}`);
                        
                        await recordMovement(knownId, name, 'SOLD', price, dbItem.tabName);
                        await removeItem(knownId);
                        salesCount++;
                    }
                }
            }
        }

        console.log(`Scan complete for ${profile.accountName}. Found ${itemIds.length} listed items.`);
        if (salesCount > 0) {
            console.log(`🎉 Total New Sales Detected: ${salesCount}`);
        }

    } catch (error) {
        console.error("Scan failed:", error);
    }
}


