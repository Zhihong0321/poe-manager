import { initDB, getKnownItemIds, saveItem, removeItem, recordMovement, type TrackingProfile } from './db.js';
import { getStashTabs, fetchItemDetails } from './api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

export async function scan(profile: TrackingProfile) {
    console.log(`[${new Date().toLocaleTimeString()}] Scanning for ${profile.accountName} in ${profile.league}...`);
    await initDB();

    // Scope known IDs to this specific profile to prevent cross-profile interference
    const knownIds = await getKnownItemIds(profile.accountName, profile.league);
    const seenIdsThisRun = new Set<string>();
    let salesCount = 0;

    try {
        // 1. Get IDs of all items listed by seller
        const { ids: itemIds, total: totalOnServer, categoryStats } = await getStashTabs(profile.accountName, profile.league, profile.sessIds);
        
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
                const indexedAt = itemResult.listing?.indexed; 

                // Determine category from raw data if available
                let category = 'other';
                if (item.category) {
                    category = Object.keys(item.category)[0] || 'other';
                }

                if (!knownIds.has(itemId)) {
                    await recordMovement(itemId, name, 'LISTED', price, tabName, profile.accountName, profile.league);
                }

                await saveItem(item, tabName, 0, profile.accountName, profile.league, category, indexedAt); 
            }

            // Update Sync Stats
            for (const [cat, count] of Object.entries(categoryStats || {})) {
                await import('./db.js').then(m => m.updateCategorySync(profile.accountName, profile.league, cat, count as number));
            }
        }

        // 3. Check for SOLD items
        const isTruncated = itemIds.length < totalOnServer;
        
        if (isTruncated) {
            console.warn(`[Scan] WARNING: Incomplete scan detected (Found ${itemIds.length} / ${totalOnServer}).`);
            console.log(`[Scan] Some sold items might not be detected until a full scan succeeds.`);
        }

        for (const knownId of knownIds) {
            if (!seenIdsThisRun.has(knownId)) {
                // If truncated, we only mark as SOLD if we are reasonably sure.
                // However, without more complex logic, we skip if truncated to be safe.
                if (isTruncated) continue;

                const dbItem = await import('./db.js').then(m => m.getItem(knownId));
                
                if (dbItem) {
                    const name = dbItem.name || dbItem.typeLine; 
                    const price = dbItem.note || 'No Price';
                    
                    console.log(`\n💰💰💰 ITEM SOLD! 💰💰💰`);
                    console.log(`Item:  ${name}`);
                    console.log(`Price: ${price}`);
                    console.log(`Tab:   ${dbItem.tabName}`);
                    
                    await recordMovement(knownId, name, 'SOLD', price, dbItem.tabName, profile.accountName, profile.league);
                    await removeItem(knownId);

                    salesCount++;
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



