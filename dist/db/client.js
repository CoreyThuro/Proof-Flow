"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.queryOne = queryOne;
exports.transaction = transaction;
const pg_1 = require("pg");
let pool = null;
function getPool() {
    if (!pool) {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL environment variable is not set');
        }
        pool = new pg_1.Pool({ connectionString: databaseUrl });
    }
    return pool;
}
async function query(sql, params) {
    const result = await getPool().query(sql, params);
    return result.rows;
}
async function queryOne(sql, params) {
    const result = await getPool().query(sql, params);
    return result.rows[0] ?? null;
}
async function transaction(fn) {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
function shutdown() {
    if (pool) {
        pool.end().catch(() => {
            // ignore errors during shutdown
        });
        pool = null;
    }
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
//# sourceMappingURL=client.js.map