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

  // Adicionar colunas na tabela users (idempotente)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin'`);
  await pool.query(`UPDATE users SET role = 'admin' WHERE role IS NULL`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      project_id INT REFERENCES projects(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'aberto',
      priority VARCHAR(20) DEFAULT 'media',
      assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
      created_by INT REFERENCES users(id) ON DELETE SET NULL,
      client_name VARCHAR(255),
      client_email VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ticket_messages (
      id SERIAL PRIMARY KEY,
      ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      author_name VARCHAR(255),
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Tickets: categoria e urgência
  await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'suporte'`);
  await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS urgency  VARCHAR(20) DEFAULT 'media'`);

  // Mensagens: nota interna vs pública
  await pool.query(`ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false`);

  console.log('Migrations aplicadas.');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
