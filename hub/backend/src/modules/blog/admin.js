const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../../db/pool');
const auth = require('../../middleware/auth');
const {
  BLOG_STATUSES,
  buildPaginatedResponse,
  buildPublicApiUrl,
  calculateReadingTime,
  ensureUniqueSlug,
  ensureUploadDir,
  escapeLike,
  generateSafeFilename,
  getMaxUploadBytes,
  getStatusDates,
  handleUnexpected,
  makeExcerpt,
  normalizeTags,
  parseInteger,
  parseNullableString,
  parsePagination,
  sanitizeOriginalFilename,
  sendError,
  validateUploadedImage,
} = require('./helpers');

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return sendError(res, 403, 'Acesso negado', 'BLOG_FORBIDDEN');
  next();
};

const postSelect = `
  SELECT p.*,
         c.name AS category_name,
         c.slug AS category_slug,
         u.name AS author_name,
         u.email AS author_email,
         COALESCE((
           SELECT json_agg(
             json_build_object('id', t.id, 'name', t.name, 'slug', t.slug)
             ORDER BY t.name
           )
           FROM blog_post_tags pt
           JOIN blog_tags t ON t.id = pt.tag_id
           WHERE pt.post_id = p.id
         ), '[]'::json) AS tags
    FROM blog_posts p
    LEFT JOIN blog_categories c ON c.id = p.category_id
    LEFT JOIN users u ON u.id = p.author_id
`;

function buildAdminPostFilters(query) {
  const params = [];
  const where = ['p.deleted_at IS NULL'];

  if (query.status && query.status !== 'all') {
    if (!BLOG_STATUSES.has(query.status)) {
      return { error: `Status inválido: ${query.status}` };
    }
    params.push(query.status);
    where.push(`p.status = $${params.length}`);
  }

  if (query.category && query.category !== 'all') {
    params.push(query.category);
    where.push(`c.slug = $${params.length}`);
  }

  if (query.tag && query.tag !== 'all') {
    params.push(query.tag);
    where.push(`EXISTS (
      SELECT 1
      FROM blog_post_tags pt
      JOIN blog_tags t ON t.id = pt.tag_id
      WHERE pt.post_id = p.id AND t.slug = $${params.length}
    )`);
  }

  if (query.q) {
    params.push(`%${escapeLike(query.q)}%`);
    const idx = params.length;
    where.push(`(
      p.title ILIKE $${idx} ESCAPE '\\' OR
      COALESCE(p.excerpt, '') ILIKE $${idx} ESCAPE '\\' OR
      COALESCE(p.content, '') ILIKE $${idx} ESCAPE '\\' OR
      EXISTS (
        SELECT 1
        FROM blog_post_tags pt
        JOIN blog_tags t ON t.id = pt.tag_id
        WHERE pt.post_id = p.id AND (t.name ILIKE $${idx} ESCAPE '\\' OR t.slug ILIKE $${idx} ESCAPE '\\')
      )
    )`);
  }

  return { params, where };
}

const { absoluteDir, relativeDir } = ensureUploadDir();
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, absoluteDir),
  filename: (req, file, cb) => cb(null, generateSafeFilename(sanitizeOriginalFilename(file.originalname))),
});

const upload = multer({
  storage,
  limits: { fileSize: getMaxUploadBytes() },
  fileFilter: (req, file, cb) => {
    const sanitized = sanitizeOriginalFilename(file.originalname);
    const ext = path.extname(sanitized).toLowerCase();
    if (!sanitized || sanitized.startsWith('.') || !['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) {
      return cb(new Error('Tipo de arquivo não permitido'));
    }
    cb(null, true);
  },
});

router.use(auth, adminOnly);

async function syncPostTags(client, postId, tagIds) {
  await client.query('DELETE FROM blog_post_tags WHERE post_id = $1', [postId]);
  for (const tagId of tagIds) {
    await client.query(
      'INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, tagId]
    );
  }
}

async function loadPostById(id) {
  const { rows } = await pool.query(`${postSelect} WHERE p.deleted_at IS NULL AND p.id = $1`, [id]);
  return rows[0] || null;
}

async function validateBlogPayload(body, currentPublishedAt = null) {
  const title = parseNullableString(body.title);
  const content = String(body.content || '').trim();
  if (!title || !content) {
    return { error: 'Título e conteúdo são obrigatórios' };
  }

  const normalizedStatus = BLOG_STATUSES.has(body.status) ? body.status : 'draft';
  const statusDates = getStatusDates(
    normalizedStatus,
    body.published_at,
    body.scheduled_at,
    currentPublishedAt
  );

  return {
    title,
    content,
    status: statusDates.status,
    publishedAt: statusDates.publishedAt,
    scheduledAt: statusDates.scheduledAt,
    categoryId: parseInteger(body.category_id),
    authorId: parseInteger(body.author_id),
    seoTitle: parseNullableString(body.seo_title),
    seoDescription: parseNullableString(body.seo_description),
    canonicalUrl: parseNullableString(body.canonical_url),
    ogImageUrl: parseNullableString(body.og_image_url),
    coverImageUrl: parseNullableString(body.cover_image_url),
    tagIds: normalizeTags(body.tag_ids),
  };
}

function buildCanonicalUrl(slug) {
  return slug ? `https://jonaspacheco.cloud/blog/${slug}` : null;
}

router.get('/posts', async (req, res) => {
  try {
    const filters = buildAdminPostFilters(req.query);
    if (filters.error) return sendError(res, 400, filters.error, 'BLOG_INVALID_FILTER');

    const { page, limit, offset } = parsePagination(req.query);
    const whereSql = filters.where.length ? `WHERE ${filters.where.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM blog_posts p
      LEFT JOIN blog_categories c ON c.id = p.category_id
      ${whereSql}
    `;
    const listSql = `
      ${postSelect}
      ${whereSql}
      ORDER BY COALESCE(p.published_at, p.scheduled_at, p.created_at) DESC, p.created_at DESC
      LIMIT $${filters.params.length + 1}
      OFFSET $${filters.params.length + 2}
    `;

    const [countResult, listResult] = await Promise.all([
      pool.query(countSql, filters.params),
      pool.query(listSql, [...filters.params, limit, offset]),
    ]);

    res.json(buildPaginatedResponse(listResult.rows, countResult.rows[0]?.total || 0, page, limit));
  } catch (err) {
    handleUnexpected(res, err);
  }
});

router.get('/posts/:id', async (req, res) => {
  try {
    const post = await loadPostById(req.params.id);
    if (!post) return sendError(res, 404, 'Post não encontrado', 'BLOG_POST_NOT_FOUND');
    res.json(post);
  } catch (err) {
    handleUnexpected(res, err);
  }
});

router.post('/posts', async (req, res) => {
  const client = await pool.connect();
  try {
    const payload = await validateBlogPayload(req.body, null);
    if (payload.error) return sendError(res, 400, payload.error, 'BLOG_VALIDATION_ERROR');

    const slug = await ensureUniqueSlug(pool, req.body.slug || payload.title);
    const readingTime = calculateReadingTime(payload.content);
    const canonicalUrl = payload.canonicalUrl || buildCanonicalUrl(slug);
    const ogImageUrl = payload.ogImageUrl || payload.coverImageUrl || null;

    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO blog_posts
        (title, slug, excerpt, content, cover_image_url, status, category_id, author_id,
         seo_title, seo_description, canonical_url, og_image_url, reading_time_minutes,
         published_at, scheduled_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        payload.title,
        slug,
        makeExcerpt(req.body.excerpt, payload.content),
        payload.content,
        payload.coverImageUrl,
        payload.status,
        payload.categoryId,
        payload.authorId || req.user.id,
        payload.seoTitle,
        payload.seoDescription,
        canonicalUrl,
        ogImageUrl,
        readingTime,
        payload.publishedAt,
        payload.scheduledAt,
      ]
    );
    await syncPostTags(client, rows[0].id, payload.tagIds);
    await client.query('COMMIT');
    res.status(201).json(await loadPostById(rows[0].id));
  } catch (err) {
    await client.query('ROLLBACK');
    handleUnexpected(res, err);
  } finally {
    client.release();
  }
});

router.put('/posts/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows: existingRows } = await client.query(
      'SELECT * FROM blog_posts WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    const existing = existingRows[0];
    if (!existing) return sendError(res, 404, 'Post não encontrado', 'BLOG_POST_NOT_FOUND');

    const payload = await validateBlogPayload(req.body, existing.published_at);
    if (payload.error) return sendError(res, 400, payload.error, 'BLOG_VALIDATION_ERROR');
    const slug = await ensureUniqueSlug(pool, req.body.slug || payload.title, req.params.id);
    const canonicalUrl = payload.canonicalUrl || buildCanonicalUrl(slug);
    const ogImageUrl = payload.ogImageUrl || payload.coverImageUrl || null;

    await client.query('BEGIN');
    await client.query(
      `UPDATE blog_posts SET
         title = $1,
         slug = $2,
         excerpt = $3,
         content = $4,
         cover_image_url = $5,
         status = $6,
         category_id = $7,
         author_id = $8,
         seo_title = $9,
         seo_description = $10,
         canonical_url = $11,
         og_image_url = $12,
         reading_time_minutes = $13,
         published_at = $14,
         scheduled_at = $15,
         updated_at = NOW()
       WHERE id = $16`,
      [
        payload.title,
        slug,
        makeExcerpt(req.body.excerpt, payload.content),
        payload.content,
        payload.coverImageUrl,
        payload.status,
        payload.categoryId,
        payload.authorId || req.user.id,
        payload.seoTitle,
        payload.seoDescription,
        canonicalUrl,
        ogImageUrl,
        calculateReadingTime(payload.content),
        payload.publishedAt,
        payload.scheduledAt,
        req.params.id,
      ]
    );
    await syncPostTags(client, req.params.id, payload.tagIds);
    await client.query('COMMIT');
    res.json(await loadPostById(req.params.id));
  } catch (err) {
    await client.query('ROLLBACK');
    handleUnexpected(res, err);
  } finally {
    client.release();
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    await pool.query('UPDATE blog_posts SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    handleUnexpected(res, err);
  }
});

router.patch('/posts/:id/status', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT published_at FROM blog_posts WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!rows[0]) return sendError(res, 404, 'Post não encontrado', 'BLOG_POST_NOT_FOUND');

    const nextStatus = req.body.status;
    if (!BLOG_STATUSES.has(nextStatus)) {
      return sendError(res, 400, 'Status inválido', 'BLOG_INVALID_STATUS');
    }
    const dates = getStatusDates(nextStatus, req.body.published_at, req.body.scheduled_at, rows[0].published_at);
    await pool.query(
      `UPDATE blog_posts
          SET status = $1,
              published_at = $2,
              scheduled_at = $3,
              updated_at = NOW()
        WHERE id = $4`,
      [dates.status, dates.publishedAt, dates.scheduledAt, req.params.id]
    );
    res.json(await loadPostById(req.params.id));
  } catch (err) {
    handleUnexpected(res, err);
  }
});

router.post('/media/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return sendError(res, 400, 'Arquivo obrigatório', 'BLOG_UPLOAD_REQUIRED');
  try {
    const info = await validateUploadedImage(req.file);
    const url = `/${relativeDir}/${req.file.filename}`.replace(/\/{2,}/g, '/');
    const { rows } = await pool.query(
      `INSERT INTO blog_media (original_name, file_name, mime_type, size, url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        sanitizeOriginalFilename(req.file.originalname),
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        url,
        req.user.id,
      ]
    );
    res.status(201).json({
      ...rows[0],
      absolute_url: `${buildPublicApiUrl(req)}${url}`,
      storage_dir: relativeDir,
      public_path: url,
      image_info: info,
    });
  } catch (err) {
    if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
    sendError(res, 400, err.message, 'BLOG_UPLOAD_INVALID');
  }
});

router.get('/categories', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*,
             COUNT(p.id) FILTER (WHERE p.deleted_at IS NULL) AS post_count
        FROM blog_categories c
        LEFT JOIN blog_posts p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name
    `);
    res.json(rows);
  } catch (err) {
    handleUnexpected(res, err);
  }
});

router.post('/categories', async (req, res) => {
  try {
    const name = parseNullableString(req.body.name);
    if (!name) return sendError(res, 400, 'Nome obrigatório', 'BLOG_CATEGORY_NAME_REQUIRED');
    const slug = await ensureUniqueSlug(pool, req.body.slug || name, null, 'blog_categories');
    const { rows } = await pool.query(
      `INSERT INTO blog_categories (name, slug, description)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [name, slug, parseNullableString(req.body.description)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    handleUnexpected(res, err);
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const name = parseNullableString(req.body.name);
    if (!name) return sendError(res, 400, 'Nome obrigatório', 'BLOG_CATEGORY_NAME_REQUIRED');
    const slug = await ensureUniqueSlug(pool, req.body.slug || name, req.params.id, 'blog_categories');
    const { rows } = await pool.query(
      `UPDATE blog_categories
          SET name = $1, slug = $2, description = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *`,
      [name, slug, parseNullableString(req.body.description), req.params.id]
    );
    rows[0]
      ? res.json(rows[0])
      : sendError(res, 404, 'Categoria não encontrada', 'BLOG_CATEGORY_NOT_FOUND');
  } catch (err) {
    handleUnexpected(res, err);
  }
});

router.delete('/categories/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE blog_posts SET category_id = NULL, updated_at = NOW() WHERE category_id = $1', [req.params.id]);
    await client.query('DELETE FROM blog_categories WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleUnexpected(res, err);
  } finally {
    client.release();
  }
});

router.get('/tags', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*,
             COUNT(pt.post_id) AS post_count
        FROM blog_tags t
        LEFT JOIN blog_post_tags pt ON pt.tag_id = t.id
       GROUP BY t.id
       ORDER BY t.name
    `);
    res.json(rows);
  } catch (err) {
    handleUnexpected(res, err);
  }
});

router.post('/tags', async (req, res) => {
  try {
    const name = parseNullableString(req.body.name);
    if (!name) return sendError(res, 400, 'Nome obrigatório', 'BLOG_TAG_NAME_REQUIRED');
    const slug = await ensureUniqueSlug(pool, req.body.slug || name, null, 'blog_tags');
    const { rows } = await pool.query(
      `INSERT INTO blog_tags (name, slug)
       VALUES ($1,$2)
       RETURNING *`,
      [name, slug]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    handleUnexpected(res, err);
  }
});

router.put('/tags/:id', async (req, res) => {
  try {
    const name = parseNullableString(req.body.name);
    if (!name) return sendError(res, 400, 'Nome obrigatório', 'BLOG_TAG_NAME_REQUIRED');
    const slug = await ensureUniqueSlug(pool, req.body.slug || name, req.params.id, 'blog_tags');
    const { rows } = await pool.query(
      `UPDATE blog_tags
          SET name = $1, slug = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *`,
      [name, slug, req.params.id]
    );
    rows[0]
      ? res.json(rows[0])
      : sendError(res, 404, 'Tag não encontrada', 'BLOG_TAG_NOT_FOUND');
  } catch (err) {
    handleUnexpected(res, err);
  }
});

router.delete('/tags/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM blog_tags WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    handleUnexpected(res, err);
  }
});

module.exports = router;
