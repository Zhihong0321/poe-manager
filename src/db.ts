import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Use connection pool for handling multiple queries efficiently
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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

export async function recordMovement(itemId: string, name: string, event: 'LISTED' | 'SOLD', price: string, tabName: string) {
    const query = `
        INSERT INTO item_movements (item_id, item_name, event_str, price, tab_name, timestamp)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `;
    await pool.query(query, [itemId, name, event, price, tabName]);
    console.log(`[${event}] ${name} (${price}) in ${tabName}`);
}

export default pool;