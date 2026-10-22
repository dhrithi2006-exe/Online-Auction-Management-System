const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected CockroachDB pool error:', err.message);
});

/**
 * Standard parameterized query runner
 */
async function query(text, params) {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error(`DB Query Error: ${err.message} | Query: ${text}`);
    throw err;
  }
}

/**
 * CockroachDB Serializable Transaction Runner with automatic 40001 retry handling
 * @param {Function} callback - async function(client) => result
 * @param {number} maxRetries - default 5
 */
async function withTransaction(callback, maxRetries = 5) {
  const client = await pool.connect();
  try {
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      try {
        await client.query('BEGIN;');
        const result = await callback(client);
        await client.query('COMMIT;');
        return result;
      } catch (err) {
        try {
          await client.query('ROLLBACK;');
        } catch (rbErr) {
          // ignore rollback failure
        }

        // 40001 is CockroachDB's serialization conflict / retry error code
        if (err.code === '40001' && attempt < maxRetries) {
          console.warn(`CockroachDB conflict (40001). Retrying transaction (attempt ${attempt}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, 20 + Math.floor(Math.random() * 30)));
          continue;
        }
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

/**
 * Safe ID allocation function:
 * Locks the current maximum ID record using FOR UPDATE within a transaction,
 * preventing concurrent duplicate ID generation.
 * @param {object} client - pg client inside an active transaction
 * @param {string} tableName - target table name
 * @param {string} idColumn - target primary key column name
 * @param {number} baseId - minimum starting ID if table is empty (e.g. 100 for users, 500 for items)
 */
async function getNextId(client, tableName, idColumn, baseId = 0) {
  const allowedTables = ['app_user', 'category', 'item', 'auction', 'bid', 'watchlist', 'payment', 'shipping', 'review'];
  const allowedCols = ['userid', 'categoryid', 'itemid', 'auctionid', 'bidid', 'watchlistid', 'paymentid', 'shippingid', 'reviewid'];

  if (!allowedTables.includes(tableName.toLowerCase()) || !allowedCols.includes(idColumn.toLowerCase())) {
    throw new Error('Invalid table or column for ID generation');
  }

  // Use FOR UPDATE to lock the current maximum row and serialize concurrent allocators
  const res = await client.query(
    `SELECT ${idColumn} AS max_id FROM ${tableName} ORDER BY ${idColumn} DESC LIMIT 1 FOR UPDATE;`
  );

  if (res.rows.length === 0 || res.rows[0].max_id === null) {
    return baseId + 1;
  }
  return Number(res.rows[0].max_id) + 1;
}

module.exports = {
  pool,
  query,
  withTransaction,
  getNextId,
};
