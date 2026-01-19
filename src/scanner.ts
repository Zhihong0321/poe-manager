import { initDB, getKnownItemIds, saveItem, removeItem, recordMovement } from './db.js';
import { getStashTabs, fetchItemDetails } from './api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const LEAGUE = process.env.LEAGUE || 'Standard';
const POE_ACCOUNT = process.env.POE_ACCOUNT || '';

export async function scan() {
    console.log(`[${new Date().toLocaleTimeString()}] Scanning items for ${POE_ACCOUNT} in ${LEAGUE}...`);
    await initDB();

    const knownIds = await getKnownItemIds();
    const seenIdsThisRun = new Set<string>();
    let salesCount = 0;

    try {
        // 1. Get IDs of all items listed by seller
        const itemIds = await getStashTabs(LEAGUE);
        
        if (itemIds.length > 0) {
            // 2. Fetch full details for these items
            const items = await fetchItemDetails(itemIds);

            for (const itemResult of items) {
                const item = itemResult.item;
                const itemId = item.id;
                seenIdsThisRun.add(itemId);

                const price = item.note || 'No Price';
                const name = item.name || item.typeLine;
                const tabName = itemResult.listing?.stash?.name || 'Unknown Tab';

                if (!knownIds.has(itemId)) {
                    await recordMovement(itemId, name, 'LISTED', price, tabName);
                }

                // Update DB with latest state
                await saveItem(item, tabName, 0); 
            }
        }

        // 3. Check for SOLD items
        for (const knownId of knownIds) {
            if (!seenIdsThisRun.has(knownId)) {
                // We use the imported function directly now
                const dbItem = await import('./db.js').then(m => m.getItem(knownId));
                
                if (dbItem) {
                    const name = dbItem.name || dbItem.typeLine; 
                    const price = dbItem.note || 'No Price';
                    console.log(`\n💰💰💰 ITEM SOLD! 💰💰💰`);
                    console.log(`Item:  ${name}`);
                    console.log(`Price: ${price}`);
                    console.log(`Tab:   ${dbItem.tabName}`);
                    console.log(`-------------------------\n`);
                    
                    await recordMovement(knownId, name, 'SOLD', price, dbItem.tabName);
                    await removeItem(knownId);
                    salesCount++;
                }
            }
        }

        console.log(`Scan complete. Found ${itemIds.length} listed items.`);
        if (salesCount > 0) {
            console.log(`🎉 Total New Sales Detected: ${salesCount}`);
        }

    } catch (error) {
        console.error("Scan failed:", error);
    }
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    scan();
}


