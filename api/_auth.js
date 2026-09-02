import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const HASH_PREFIX = 'hp_pbkdf2_sha256';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function getSecret(name) {
  const secret = process.env[name];
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    const err = new Error(`${name} configuration missing in server environment.`);
    err.code = `${name}_MISSING`;
    err.status = 500;
    throw err;
  }
  return secret.trim();
}

export function getActivationTokenSecret() {
  return getSecret('ACTIVATION_TOKEN_SECRET');
}

function getSessionSecret() {
  return process.env.SAAS_SESSION_SECRET?.trim() || getActivationTokenSecret();
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function hashPassword(password) {
  return bcrypt.hashSync(String(password), 10);
}

export function verifyPassword(password, storedHash) {
  const stored = String(storedHash || '');
  if (!stored) return { ok: false, upgradeHash: null };

  // 1. bcrypt verification
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    try {
      const ok = bcrypt.compareSync(String(password), stored);
      return { ok, upgradeHash: null };
    } catch {
      return { ok: false, upgradeHash: null };
    }
  }

  // 2. pbkdf2 verification
  if (stored.startsWith(`${HASH_PREFIX}$`)) {
    const [, iterationsRaw, salt, digest] = stored.split('$');
    const iterations = Number(iterationsRaw);
    if (!iterations || !salt || !digest) return { ok: false, upgradeHash: null };
    const candidate = crypto
      .pbkdf2Sync(String(password), salt, iterations, 32, 'sha256')
      .toString('base64url');
    const ok = safeEqual(candidate, digest);
    return { ok, upgradeHash: ok ? hashPassword(password) : null };
  }

  // 3. Legacy plaintext verification with auto-upgrade to salted bcrypt hash
  const legacyOk = safeEqual(String(password).trim(), stored.trim());
  return { ok: legacyOk, upgradeHash: legacyOk ? hashPassword(password) : null };
}

export function signSaasToken(user) {
  const now = Date.now();
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + TOKEN_TTL_MS
  };
  const encoded = base64urlJson(payload);
  const signature = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySaasToken(token) {
  try {
    const [encoded, signature] = String(token || '').split('.');
    if (!encoded || !signature) return null;
    const expected = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
    if (!safeEqual(signature, expected)) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function requireSaasAdminAuth(req, res, allowedRoles = ['super_admin', 'saas_manager']) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = String(header).startsWith('Bearer ') ? String(header).slice(7) : '';
  const session = verifySaasToken(token);
  if (!session) {
    res.status(401).json({ error: 'SaaS admin authentication required', code: 'SAAS_AUTH_REQUIRED' });
    return null;
  }
  if (allowedRoles.length && !allowedRoles.includes(session.role)) {
    res.status(403).json({ error: 'Insufficient SaaS admin permissions', code: 'SAAS_FORBIDDEN' });
    return null;
  }
  req.saasAdmin = session;
  return session;
}
