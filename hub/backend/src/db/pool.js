const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  client_encoding: 'UTF8',
});
module.exports = pool;
