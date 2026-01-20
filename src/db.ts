import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Use connection pool for handling multiple queries efficiently
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Handle pool errors to prevent process crashes
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export async function initDB() {
    const client = await pool.connect();
    try {
        // Table to store the latest known state of items
        // usage: snake_case for columns to match PG default behavior
        await client.query(`
            CREATE TABLE IF NOT EXISTS item_snapshots (
                id TEXT PRIMARY KEY, 
                name TEXT,
                type_line TEXT,
                tab_name TEXT,
                tab_index INTEGER,
                note TEXT, 
                stack_size INTEGER,
                raw_data JSONB, 
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table to record movements (IN/OUT)
        await client.query(`
            CREATE TABLE IF NOT EXISTS item_movements (
                id SERIAL PRIMARY KEY,
                item_id TEXT,
                item_name TEXT,
                event_str TEXT, 
                price TEXT,
                tab_name TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                details TEXT
            )
        `);

        // Table for App Settings
        await client.query(`
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        // Table for Tracking Profiles
        await client.query(`
            CREATE TABLE IF NOT EXISTS tracking_profiles (
                id SERIAL PRIMARY KEY,
                account_name TEXT NOT NULL,
                league TEXT NOT NULL,
                sess_id TEXT, -- Legacy
                sess_ids TEXT, -- JSON Array of cookies
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration: ensure sess_ids exists for legacy rows
        await client.query(`
            UPDATE tracking_profiles 
            SET sess_ids = jsonb_build_array(sess_id)::text 
            WHERE sess_ids IS NULL AND sess_id IS NOT NULL
        `);

        // Table for Market Watch Profiles
        await client.query(`
            CREATE TABLE IF NOT EXISTS market_watch_profiles (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                league TEXT NOT NULL,
                item_category TEXT,
                min_ilvl INTEGER,
                max_ilvl INTEGER,
                min_req_level INTEGER,
                max_req_level INTEGER,
                min_quality INTEGER,
                min_evasion INTEGER,
                min_armour INTEGER,
                min_es INTEGER,
                sort_by TEXT NOT NULL, -- evasion, armour, es, dps, phys_dps
                interval_min INTEGER DEFAULT 60,
                last_run TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table for Market Watch Snapshots
        await client.query(`
            CREATE TABLE IF NOT EXISTS market_watch_snapshots (
                id SERIAL PRIMARY KEY,
                profile_id INTEGER REFERENCES market_watch_profiles(id) ON DELETE CASCADE,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                items_json JSONB NOT NULL
            )
        `);
        
        // Insert default interval if not exists (default 10 minutes)
        await client.query(`
            INSERT INTO app_settings (key, value) VALUES ('scan_interval_min', '10') 
            ON CONFLICT DO NOTHING
        `);

        console.log('Database initialized (PostgreSQL).');
    } finally {
        client.release();
    }
}

// --- Profiles ---

export interface TrackingProfile {
    id: number;
    accountName: string;
    league: string;
    sessIds: string[];
    isActive: boolean;
}

export async function addProfile(accountName: string, league: string, sessIds: string[]) {
    await pool.query(
        'INSERT INTO tracking_profiles (account_name, league, sess_ids) VALUES ($1, $2, $3)',
        [accountName, league, JSON.stringify(sessIds)]
    );
}

export async function getProfiles(): Promise<TrackingProfile[]> {
    const res = await pool.query('SELECT * FROM tracking_profiles ORDER BY id ASC');
    return res.rows.map(r => ({
        id: r.id,
        accountName: r.account_name,
        league: r.league,
        sessIds: r.sess_ids ? JSON.parse(r.sess_ids) : (r.sess_id ? [r.sess_id] : []),
        isActive: r.is_active
    }));
}

export async function getProfileById(id: number): Promise<TrackingProfile | null> {
    const res = await pool.query('SELECT * FROM tracking_profiles WHERE id = $1', [id]);
    const r = res.rows[0];
    if (!r) return null;
    return {
        id: r.id,
        accountName: r.account_name,
        league: r.league,
        sessIds: r.sess_ids ? JSON.parse(r.sess_ids) : (r.sess_id ? [r.sess_id] : []),
        isActive: r.is_active
    };
}

export async function getActiveProfiles(): Promise<TrackingProfile[]> {
    const res = await pool.query('SELECT * FROM tracking_profiles WHERE is_active = TRUE');
    return res.rows.map(r => ({
        id: r.id,
        accountName: r.account_name,
        league: r.league,
        sessIds: r.sess_ids ? JSON.parse(r.sess_ids) : (r.sess_id ? [r.sess_id] : []),
        isActive: r.is_active
    }));
}

export async function toggleProfile(id: number, isActive: boolean) {
    await pool.query('UPDATE tracking_profiles SET is_active = $1 WHERE id = $2', [isActive, id]);
}

export async function deleteProfile(id: number) {
    await pool.query('DELETE FROM tracking_profiles WHERE id = $1', [id]);
}

// --- Settings ---

export async function getSetting(key: string): Promise<string | null> {
    const res = await pool.query('SELECT value FROM app_settings WHERE key = $1', [key]);
    return res.rows[0]?.value || null;
}

export async function setSetting(key: string, value: string) {
    const query = `
        INSERT INTO app_settings (key, value) VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    await pool.query(query, [key, value]);
}

export async function getSalesHistory() {
    // Return sold items sorted by newest first
    const res = await pool.query(`
        SELECT * FROM item_movements 
        WHERE event_str = 'SOLD' 
        ORDER BY timestamp DESC
    `);
    
    // Map snake_case to camelCase for frontend
    return res.rows.map(row => ({
        id: row.id,
        itemId: row.item_id,
        itemName: row.item_name,
        event: row.event_str,
        price: row.price,
        tabName: row.tab_name,
        timestamp: row.timestamp,
        details: row.details
    }));
}

export async function getKnownItemIds(): Promise<Set<string>> {
    const res = await pool.query('SELECT id FROM item_snapshots');
    return new Set(res.rows.map(r => r.id));
}

export async function getItem(id: string) {
    const res = await pool.query('SELECT * FROM item_snapshots WHERE id = $1', [id]);
    const row = res.rows[0];
    if (!row) return null;
    
    // Map back to camelCase for the app
    return {
        id: row.id,
        name: row.name,
        typeLine: row.type_line,
        tabName: row.tab_name,
        tabIndex: row.tab_index,
        note: row.note,
        stackSize: row.stack_size,
        rawData: row.raw_data,
        lastSeen: row.last_seen
    };
}

export async function saveItem(item: any, tabName: string, tabIndex: number) {
    const query = `
        INSERT INTO item_snapshots (id, name, type_line, tab_name, tab_index, note, stack_size, raw_data, last_seen)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type_line = EXCLUDED.type_line,
            tab_name = EXCLUDED.tab_name,
            tab_index = EXCLUDED.tab_index,
            note = EXCLUDED.note,
            stack_size = EXCLUDED.stack_size,
            raw_data = EXCLUDED.raw_data,
            last_seen = CURRENT_TIMESTAMP
    `;
    const values = [
        item.id,
        item.name,
        item.typeLine,
        tabName,
        tabIndex,
        item.note || '',
        item.stackSize || 1,
        JSON.stringify(item)
    ];
    await pool.query(query, values);
}

export async function removeItem(id: string) {
    await pool.query('DELETE FROM item_snapshots WHERE id = $1', [id]);
}

export async function clearAllTrackingData() {
    await pool.query('DELETE FROM item_snapshots');
    await pool.query('DELETE FROM item_movements');
}

export async function getAllSnapshots() {
    const res = await pool.query('SELECT * FROM item_snapshots ORDER BY last_seen DESC');
    return res.rows.map(row => ({
        id: row.id,
        name: row.name,
        typeLine: row.type_line,
        tabName: row.tab_name,
        tabIndex: row.tab_index,
        note: row.note,
        stackSize: row.stack_size,
        rawData: row.raw_data,
        lastSeen: row.last_seen
    }));
}

export async function recordMovement(itemId: string, name: string, event: 'LISTED' | 'SOLD', price: string, tabName: string) {
    const query = `
        INSERT INTO item_movements (item_id, item_name, event_str, price, tab_name, timestamp)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `;
        await pool.query(query, [itemId, name, event, price, tabName]);
        console.log(`[${event}] ${name} (${price}) in ${tabName}`);
    }
    
    // --- Market Watch ---
    
    export interface MarketProfile {
        id: number;
        name: string;
        league: string;
        itemCategory: string;
        minIlvl: number | null;
        maxIlvl: number | null;
        minReqLevel: number | null;
        maxReqLevel: number | null;
        minQuality: number | null;
        minEvasion: number | null;
        minArmour: number | null;
        minEs: number | null;
        sortBy: string;
        intervalMin: number;
        lastRun: Date | null;
        isActive: boolean;
    }
    
    export async function addMarketProfile(profile: Partial<MarketProfile>) {
        const query = `
            INSERT INTO market_watch_profiles (
                name, league, item_category, min_ilvl, max_ilvl, 
                min_req_level, max_req_level, min_quality, 
                min_evasion, min_armour, min_es, sort_by, interval_min
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `;
        const values = [
            profile.name, profile.league, profile.itemCategory, profile.minIlvl, profile.maxIlvl,
            profile.minReqLevel, profile.maxReqLevel, profile.minQuality,
            profile.minEvasion, profile.minArmour, profile.minEs, profile.sortBy, profile.intervalMin
        ];
        await pool.query(query, values);
    }

    export async function updateMarketProfile(id: number, profile: Partial<MarketProfile>) {
        const query = `
            UPDATE market_watch_profiles SET
                name = $1, league = $2, item_category = $3, min_ilvl = $4, max_ilvl = $5,
                min_req_level = $6, max_req_level = $7, min_quality = $8,
                min_evasion = $9, min_armour = $10, min_es = $11, sort_by = $12, interval_min = $13
            WHERE id = $14
        `;
        const values = [
            profile.name, profile.league, profile.itemCategory, profile.minIlvl, profile.maxIlvl,
            profile.minReqLevel, profile.maxReqLevel, profile.minQuality,
            profile.minEvasion, profile.minArmour, profile.minEs, profile.sortBy, profile.intervalMin,
            id
        ];
        await pool.query(query, values);
    }
    
    export async function getMarketProfiles(): Promise<MarketProfile[]> {
        const res = await pool.query('SELECT * FROM market_watch_profiles ORDER BY id ASC');
        return res.rows.map(r => ({
            id: r.id,
            name: r.name,
            league: r.league,
            itemCategory: r.item_category,
            minIlvl: r.min_ilvl,
            maxIlvl: r.max_ilvl,
            minReqLevel: r.min_req_level,
            maxReqLevel: r.max_req_level,
            minQuality: r.min_quality,
            minEvasion: r.min_evasion,
            minArmour: r.min_armour,
            minEs: r.min_es,
            sortBy: r.sort_by,
            intervalMin: r.interval_min,
            lastRun: r.last_run,
            isActive: r.is_active
        }));
    }
    
    export async function getMarketProfileById(id: number): Promise<MarketProfile | null> {
        const res = await pool.query('SELECT * FROM market_watch_profiles WHERE id = $1', [id]);
        const r = res.rows[0];
        if (!r) return null;
        return {
            id: r.id,
            name: r.name,
            league: r.league,
            itemCategory: r.item_category,
            minIlvl: r.min_ilvl,
            maxIlvl: r.max_ilvl,
            minReqLevel: r.min_req_level,
            maxReqLevel: r.max_req_level,
            minQuality: r.min_quality,
            minEvasion: r.min_evasion,
            minArmour: r.min_armour,
            minEs: r.min_es,
            sortBy: r.sort_by,
            intervalMin: r.interval_min,
            lastRun: r.last_run,
            isActive: r.is_active
        };
    }
    
    export async function updateMarketProfileLastRun(id: number) {
        await pool.query('UPDATE market_watch_profiles SET last_run = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    }
    
    export async function toggleMarketProfile(id: number, isActive: boolean) {
        await pool.query('UPDATE market_watch_profiles SET is_active = $1 WHERE id = $2', [isActive, id]);
    }
    
    export async function deleteMarketProfile(id: number) {
        await pool.query('DELETE FROM market_watch_profiles WHERE id = $1', [id]);
    }
    
    export async function saveMarketSnapshot(profileId: number, items: any[]) {
        await pool.query(
            'INSERT INTO market_watch_snapshots (profile_id, items_json) VALUES ($1, $2)',
            [profileId, JSON.stringify(items)]
        );
    }
    
export async function getLatestMarketSnapshot(profileId: number) {
    const res = await pool.query(
        'SELECT * FROM market_watch_snapshots WHERE profile_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [profileId]
    );
    return res.rows[0];
}

export async function getMarketSnapshots(profileId: number, limit: number = 24) {
    const res = await pool.query(
        'SELECT * FROM market_watch_snapshots WHERE profile_id = $1 ORDER BY timestamp DESC LIMIT $2',
        [profileId, limit]
    );
    return res.rows;
}
    
    export default pool;
    