const fs = require('fs');
const path = require('path');

const BLOG_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);
const BLOG_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);
const BLOG_STATUSES = new Set(['draft', 'published', 'scheduled', 'archived']);
const MAX_PAGE_SIZE = 50;

function sendError(res, status, message, code = 'BLOG_ERROR', details = null) {
  return res.status(status).json({
    error: message,
    code,
    ...(details ? { details } : {}),
  });
}

function handleUnexpected(res, err, fallback = 'Erro interno no módulo de blog') {
  return sendError(res, 500, err?.message || fallback, 'BLOG_INTERNAL_ERROR');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function stripMarkdown(content) {
  return String(content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateReadingTime(content) {
  const text = stripMarkdown(content);
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function makeExcerpt(excerpt, content) {
  if (excerpt && String(excerpt).trim()) return String(excerpt).trim();
  const base = stripMarkdown(content);
  if (!base) return '';
  return base.length > 180 ? `${base.slice(0, 177)}...` : base;
}

function parseNullableString(value) {
  if (value === undefined || value === null) return null;
  const parsed = String(value).trim();
  return parsed ? parsed : null;
}

function parseInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getStatusDates(status, publishedAt, scheduledAt, currentPublishedAt) {
  if (!BLOG_STATUSES.has(status)) {
    throw new Error('Status inválido');
  }

  if (status === 'published') {
    return {
      status,
      publishedAt: parseTimestamp(publishedAt) || currentPublishedAt || new Date().toISOString(),
      scheduledAt: null,
    };
  }

  if (status === 'scheduled') {
    const nextScheduledAt = parseTimestamp(scheduledAt);
    if (!nextScheduledAt) {
      throw new Error('Data de agendamento obrigatória para posts agendados');
    }
    return { status, publishedAt: null, scheduledAt: nextScheduledAt };
  }

  return { status, publishedAt: null, scheduledAt: null };
}

function normalizeTags(tagIds) {
  if (!Array.isArray(tagIds)) return [];
  return [...new Set(tagIds.map(parseInteger).filter(Boolean))];
}

function escapeLike(value) {
  return String(value || '').replace(/[%_\\]/g, '\\$&');
}

function ensureUploadDir() {
  const relativeDir = process.env.BLOG_UPLOAD_DIR || 'uploads/blog';
  const normalizedRelativeDir = relativeDir.replace(/^\/+/, '').replace(/\.\./g, '');
  const absoluteDir = path.join(__dirname, '../../../', normalizedRelativeDir);
  if (!fs.existsSync(absoluteDir)) fs.mkdirSync(absoluteDir, { recursive: true });
  return { absoluteDir, relativeDir: normalizedRelativeDir };
}

function getMaxUploadBytes() {
  const mb = Number(process.env.BLOG_MAX_UPLOAD_MB || 5);
  return Math.max(1, mb) * 1024 * 1024;
}

function sanitizeOriginalFilename(name) {
  return path.basename(String(name || 'file'))
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-');
}

function generateSafeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}${ext}`;
}

function readPngSize(buffer) {
  if (buffer.length < 24) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegSize(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    const size = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + size;
  }
  return null;
}

function readWebpSize(buffer) {
  if (buffer.length < 30) return null;
  const chunkType = buffer.subarray(12, 16).toString('ascii');
  if (chunkType === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  return null;
}

async function validateUploadedImage(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!BLOG_IMAGE_EXTENSIONS.has(ext) || !BLOG_IMAGE_MIMES.has(file.mimetype)) {
    throw new Error('Formato de imagem inválido');
  }

  const buffer = await fs.promises.readFile(file.path);
  const header = buffer.subarray(0, 12);
  const svgSnippet = buffer.toString('utf8', 0, Math.min(buffer.length, 2048)).trimStart();
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP';
  const isSvg = svgSnippet.startsWith('<svg') || (svgSnippet.startsWith('<?xml') && svgSnippet.includes('<svg'));

  if (!isJpeg && !isPng && !isWebp && !isSvg) {
    throw new Error('Arquivo enviado não é uma imagem válida');
  }

  if (isSvg) {
    const lower = svgSnippet.toLowerCase();
    if (
      lower.includes('<script') ||
      lower.includes('javascript:') ||
      lower.includes('onload=') ||
      lower.includes('onerror=')
    ) {
      throw new Error('SVG com conteúdo inseguro foi bloqueado');
    }
    return { width: 0, height: 0, type: 'svg' };
  }

  let dimensions = null;
  if (isPng) dimensions = readPngSize(buffer);
  if (isJpeg) dimensions = readJpegSize(buffer);
  if (isWebp) dimensions = readWebpSize(buffer);

  if (!dimensions || !dimensions.width || !dimensions.height) {
    throw new Error('Não foi possível validar as dimensões da imagem');
  }

  if (dimensions.width < 1 || dimensions.height < 1) {
    throw new Error('Imagem com dimensões inválidas');
  }

  return { ...dimensions, type: isPng ? 'png' : isJpeg ? 'jpeg' : 'webp' };
}

function buildPublicApiUrl(req) {
  if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

async function ensureUniqueSlug(pool, baseSlug, excludeId = null, table = 'blog_posts') {
  const allowedTables = new Set(['blog_posts', 'blog_categories', 'blog_tags']);
  if (!allowedTables.has(table)) throw new Error('Tabela inválida para slug');

  const root = slugify(baseSlug) || 'post';
  let candidate = root;
  let counter = 2;

  while (true) {
    const params = [candidate];
    let sql = `SELECT id FROM ${table} WHERE slug = $1`;
    if (excludeId) {
      params.push(excludeId);
      sql += ' AND id <> $2';
    }
    const { rows } = await pool.query(sql, params);
    if (!rows[0]) return candidate;
    candidate = `${root}-${counter++}`;
  }
}

function parsePagination(query = {}) {
  const rawPage = Number(query.page || 1);
  const rawLimit = Number(query.limit || 12);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), MAX_PAGE_SIZE) : 12;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPaginatedResponse(items, total, page, limit) {
  const safeTotal = Number(total || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));
  return {
    items,
    pagination: {
      page,
      limit,
      total: safeTotal,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

module.exports = {
  BLOG_IMAGE_EXTENSIONS,
  BLOG_IMAGE_MIMES,
  BLOG_STATUSES,
  MAX_PAGE_SIZE,
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
  slugify,
  stripMarkdown,
  validateUploadedImage,
};
