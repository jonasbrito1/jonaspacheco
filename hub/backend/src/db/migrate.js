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

  // Mensagens: anexos
  await pool.query(`ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS attachment_url  VARCHAR(500)`);
  await pool.query(`ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255)`);
  await pool.query(`ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(100)`);

  // Portal de clientes: token de rastreamento + tabela client_users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_token UUID DEFAULT gen_random_uuid()`);
  await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_user_id INT REFERENCES client_users(id) ON DELETE SET NULL`);
  // Garantir token em tickets existentes
  await pool.query(`UPDATE tickets SET ticket_token = gen_random_uuid() WHERE ticket_token IS NULL`);

  // ──────────────────────────────────────────────
  // TASKFLOW — gestão de tarefas tipo Kanban
  // ──────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tf_boards (
      id          SERIAL PRIMARY KEY,
      project_id  INT REFERENCES projects(id) ON DELETE SET NULL,
      name        VARCHAR(255) NOT NULL,
      description TEXT,
      created_by  INT REFERENCES users(id) ON DELETE SET NULL,
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tf_columns (
      id         SERIAL PRIMARY KEY,
      board_id   INT REFERENCES tf_boards(id) ON DELETE CASCADE,
      name       VARCHAR(100) NOT NULL,
      color      VARCHAR(20)  DEFAULT '#475569',
      position   REAL         NOT NULL DEFAULT 0,
      is_done    BOOLEAN      DEFAULT false,
      created_at TIMESTAMP    DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tf_tasks (
      id          SERIAL PRIMARY KEY,
      board_id    INT  REFERENCES tf_boards(id)  ON DELETE CASCADE,
      column_id   INT  REFERENCES tf_columns(id) ON DELETE SET NULL,
      parent_id   INT  REFERENCES tf_tasks(id)   ON DELETE CASCADE,
      title       VARCHAR(500) NOT NULL,
      description TEXT,
      priority    VARCHAR(20)  DEFAULT 'none',
      due_date    DATE,
      position    REAL         NOT NULL DEFAULT 0,
      created_by  INT  REFERENCES users(id) ON DELETE SET NULL,
      created_at  TIMESTAMP    DEFAULT NOW(),
      updated_at  TIMESTAMP    DEFAULT NOW(),
      deleted_at  TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tf_task_assignees (
      task_id INT REFERENCES tf_tasks(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id)    ON DELETE CASCADE,
      PRIMARY KEY (task_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS tf_labels (
      id       SERIAL PRIMARY KEY,
      board_id INT REFERENCES tf_boards(id) ON DELETE CASCADE,
      name     VARCHAR(100) NOT NULL,
      color    VARCHAR(20)  DEFAULT '#475569'
    );

    CREATE TABLE IF NOT EXISTS tf_task_labels (
      task_id  INT REFERENCES tf_tasks(id)  ON DELETE CASCADE,
      label_id INT REFERENCES tf_labels(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, label_id)
    );

    CREATE TABLE IF NOT EXISTS tf_comments (
      id         SERIAL PRIMARY KEY,
      task_id    INT REFERENCES tf_tasks(id)    ON DELETE CASCADE,
      user_id    INT REFERENCES users(id)        ON DELETE SET NULL,
      content    TEXT NOT NULL,
      parent_id  INT REFERENCES tf_comments(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tf_time_entries (
      id               SERIAL PRIMARY KEY,
      task_id          INT REFERENCES tf_tasks(id) ON DELETE CASCADE,
      user_id          INT REFERENCES users(id)    ON DELETE SET NULL,
      description      VARCHAR(255),
      started_at       TIMESTAMP,
      ended_at         TIMESTAMP,
      duration_minutes INT,
      is_running       BOOLEAN DEFAULT false,
      created_at       TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tf_attachments (
      id         SERIAL PRIMARY KEY,
      task_id    INT REFERENCES tf_tasks(id) ON DELETE CASCADE,
      user_id    INT REFERENCES users(id)    ON DELETE SET NULL,
      filename   VARCHAR(255) NOT NULL,
      file_url   VARCHAR(500) NOT NULL,
      file_size  INT,
      mime_type  VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS blog_tags (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      excerpt TEXT,
      content TEXT NOT NULL,
      cover_image_url TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      category_id INT REFERENCES blog_categories(id) ON DELETE SET NULL,
      author_id INT REFERENCES users(id) ON DELETE SET NULL,
      seo_title VARCHAR(255),
      seo_description TEXT,
      canonical_url TEXT,
      og_image_url TEXT,
      reading_time_minutes INT DEFAULT 1,
      published_at TIMESTAMP NULL,
      scheduled_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP NULL
    );

    CREATE TABLE IF NOT EXISTS blog_post_tags (
      post_id INT REFERENCES blog_posts(id) ON DELETE CASCADE,
      tag_id INT REFERENCES blog_tags(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS blog_media (
      id SERIAL PRIMARY KEY,
      original_name VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      size INT NOT NULL,
      url TEXT NOT NULL,
      created_by INT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON blog_posts(category_id);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled_at ON blog_posts(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_blog_media_created_by ON blog_media(created_by);
  `);

  await pool.query(`
    INSERT INTO blog_categories (name, slug, description)
    VALUES
      ('Ecossistema Dev', 'ecossistema-dev', 'Artigos sobre produtos, processos e arquitetura do ecossistema Jonas Pacheco.'),
      ('Fullstack', 'fullstack', 'Conteúdos sobre desenvolvimento fullstack, frontend e backend.'),
      ('DevSecOps', 'devsecops', 'Segurança, automação e cultura DevSecOps.')
    ON CONFLICT (slug) DO NOTHING;

    INSERT INTO blog_tags (name, slug)
    VALUES
      ('Arquitetura', 'arquitetura'),
      ('React', 'react'),
      ('Node.js', 'node-js'),
      ('Segurança', 'seguranca'),
      ('Automação', 'automacao'),
      ('DevSecOps', 'devsecops')
    ON CONFLICT (slug) DO NOTHING;
  `);

  const { rows: blogCountRows } = await pool.query('SELECT COUNT(*)::int AS count FROM blog_posts');
  if (!blogCountRows[0]?.count) {
    const { rows: adminRows } = await pool.query(`SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`);
    const authorId = adminRows[0]?.id || null;
    const { rows: catRows } = await pool.query(`SELECT id, slug FROM blog_categories`);
    const categories = Object.fromEntries(catRows.map((row) => [row.slug, row.id]));
    const { rows: tagRows } = await pool.query(`SELECT id, slug FROM blog_tags`);
    const tags = Object.fromEntries(tagRows.map((row) => [row.slug, row.id]));

    const samplePosts = [
      {
        title: 'Como estou construindo meu ecossistema dev',
        slug: 'como-estou-construindo-meu-ecossistema-dev',
        excerpt: 'Uma visão prática de como estou conectando produtos, automações e operações em um ecossistema único.',
        content: `# Como estou construindo meu ecossistema dev

Estou organizando meus produtos em uma estrutura que une landing page, hub operacional, atendimento e automações.

## O foco

- centralizar informação
- reduzir retrabalho
- acelerar operação
- manter segurança desde o início

## O que isso muda

Quando cada sistema conversa com clareza, o trabalho deixa de depender de improviso e ganha previsibilidade.`,
        categoryId: categories['ecossistema-dev'] || null,
        status: 'published',
        seoTitle: 'Como estou construindo meu ecossistema dev',
        seoDescription: 'Bastidores da construção do ecossistema de produtos e operação de Jonas Pacheco.',
        tags: [tags.arquitetura, tags.automacao].filter(Boolean),
      },
      {
        title: 'Tendências para desenvolvimento fullstack',
        slug: 'tendencias-para-desenvolvimento-fullstack',
        excerpt: 'As mudanças que mais impactam produtividade, DX e integração entre frontend e backend.',
        content: `# Tendências para desenvolvimento fullstack

O desenvolvimento fullstack ficou menos sobre fazer tudo manualmente e mais sobre integrar camadas com inteligência.

## O que observo

- frontends mais orientados a produto
- backends mais modulares
- observabilidade desde cedo
- pipelines mais confiáveis

Esses pontos melhoram velocidade sem abrir mão de consistência.`,
        categoryId: categories.fullstack || null,
        status: 'published',
        seoTitle: 'Tendências para desenvolvimento fullstack',
        seoDescription: 'Panorama das tendências práticas para times e profissionais fullstack.',
        tags: [tags.react, tags['node-js']].filter(Boolean),
      },
      {
        title: 'DevSecOps: segurança desde o início',
        slug: 'devsecops-seguranca-desde-o-inicio',
        excerpt: 'Segurança não precisa ser uma etapa final. Ela pode nascer junto com o produto e o pipeline.',
        content: `# DevSecOps: segurança desde o início

Tratar segurança apenas no fim do projeto costuma gerar custo, atraso e risco.

## Uma abordagem melhor

- políticas mínimas já no primeiro deploy
- revisão de dependências
- gestão de segredos
- validação contínua no pipeline

Segurança cedo significa menos retrabalho e mais confiança para evoluir.`,
        categoryId: categories.devsecops || null,
        status: 'published',
        seoTitle: 'DevSecOps: segurança desde o início',
        seoDescription: 'Por que DevSecOps deve começar no primeiro commit e não no fim do projeto.',
        tags: [tags.devsecops, tags.seguranca].filter(Boolean),
      },
    ];

    for (const post of samplePosts) {
      const { rows: insertedRows } = await pool.query(
        `INSERT INTO blog_posts
          (title, slug, excerpt, content, status, category_id, author_id, seo_title, seo_description,
           reading_time_minutes, published_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
         RETURNING id`,
        [
          post.title,
          post.slug,
          post.excerpt,
          post.content,
          post.status,
          post.categoryId,
          authorId,
          post.seoTitle,
          post.seoDescription,
          Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200)),
        ]
      );

      for (const tagId of post.tags) {
        await pool.query(
          'INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [insertedRows[0].id, tagId]
        );
      }
    }
  }

  console.log('Migrations aplicadas.');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
