const pool = require('./pool');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      client VARCHAR(255),
      status VARCHAR(50) DEFAULT 'em_desenvolvimento',
      technologies TEXT[] DEFAULT '{}',
      description TEXT,
      deadline DATE,
      monthly_value DECIMAL(10,2) DEFAULT 0,
      url VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      project_id INT REFERENCES projects(id) ON DELETE SET NULL,
      type VARCHAR(10) NOT NULL CHECK (type IN ('receita', 'despesa')),
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      date DATE NOT NULL,
      paid BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Migrations aplicadas.');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
