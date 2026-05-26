const router = require('express').Router();
const pool = require('../../db/pool');
const {
  buildPaginatedResponse,
  escapeLike,
  handleUnexpected,
  parsePagination,
  sendError,
} = require('./helpers');

const visibilityWhere = `
  p.deleted_at IS NULL AND (
    (p.status = 'published' AND p.published_at IS NOT NULL AND p.published_at <= NOW()) OR
    (p.status = 'scheduled' AND p.scheduled_at IS NOT NULL AND p.scheduled_at <= NOW())
  )
`;

const postSelect = `
  SELECT p.*,
         c.name AS category_name,
         c.slug AS category_slug,
         u.name AS author_name,
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

function buildPublicPostFilters(query) {
  const params = [];
  const where = [visibilityWhere];

  if (query.category) {
    params.push(query.category);
    where.push(`c.slug = $${params.length}`);
  }

  if (query.tag) {
    params.push(query.tag);
    where.push(`EXISTS (
      SELECT 1 FROM blog_post_tags pt
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

async function listPublicPosts(query) {
  const filters = buildPublicPostFilters(query);
  const { page, limit, offset } = parsePagination(query);
  const whereSql = `WHERE ${filters.where.join(' AND ')}`;

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM blog_posts p
    LEFT JOIN blog_categories c ON c.id = p.category_id
    ${whereSql}
  `;
  const listSql = `
    ${postSelect}
    ${whereSql}
    ORDER BY COALESCE(p.published_at, p.scheduled_at, p.created_at) DESC
    LIMIT $${filters.params.length + 1}
    OFFSET $${filters.params.length + 2}
  `;

  const [countResult, listResult] = await Promise.all([
    pool.query(countSql, filters.params),
    pool.query(listSql, [...filters.params, limit, offset]),
  ]);

  return buildPaginatedResponse(listResult.rows, countResult.rows[0]?.total || 0, page, limit);
}

router.get('/posts', async (req, res) => {
  try {
    res.json(await listPublicPosts(req.query));
  } catch (err) {
    handleUnexpected(res, err);
  }
});

router.get('/posts/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(`${postSelect} WHERE ${visibilityWhere} AND p.slug = $1`, [req.params.slug]);
    const post = rows[0];
    if (!post) return sendError(res, 404, 'Post não encontrado', 'BLOG_POST_NOT_FOUND');

    const tagIds = (post.tags || []).map(tag => tag.id).filter(Boolean);
    const relatedParams = [post.id];
    let relatedWhere = `${visibilityWhere} AND p.id <> $1`;
    if (post.category_id) {
      relatedParams.push(post.category_id);
      relatedWhere += ` AND p.category_id = $${relatedParams.length}`;
    } else if (tagIds.length) {
      relatedParams.push(tagIds);
      relatedWhere += ` AND EXISTS (
        SELECT 1 FROM blog_post_tags pt
        WHERE pt.post_id = p.id AND pt.tag_id = ANY($${relatedParams.length}::int[])
      )`;
    }

    const { rows: related } = await pool.query(
      `${postSelect} WHERE ${relatedWhere} ORDER BY COALESCE(p.published_at, p.scheduled_at, p.created_at) DESC LIMIT 3`,
      relatedParams
    );

    res.json({ ...post, related_posts: related });
  } catch (err) {
    handleUnexpected(res, err);
  }
});

router.get('/categories', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*,
             COUNT(p.id) FILTER (WHERE ${visibilityWhere}) AS post_count
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

router.get('/tags', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*,
             COUNT(pt.post_id) FILTER (
               WHERE EXISTS (
                 SELECT 1 FROM blog_posts p
                 WHERE p.id = pt.post_id AND ${visibilityWhere}
               )
             ) AS post_count
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

router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json(buildPaginatedResponse([], 0, 1, parsePagination(req.query).limit));
    res.json(await listPublicPosts({ ...req.query, q }));
  } catch (err) {
    handleUnexpected(res, err);
  }
});

module.exports = router;
