import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'biofridge-secret-key';
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const attempted = hashPassword(password, salt).split(':')[1];
  const hashBuffer = Buffer.from(hash, 'hex');
  const attemptedBuffer = Buffer.from(attempted, 'hex');
  if (hashBuffer.length !== attemptedBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, attemptedBuffer);
}

export function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    username: user.username,
    role: user.role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export function verifyToken(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const unsigned = `${header}.${payload}`;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(unsigned).digest('base64url');
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    if (!data.username || !['root', 'user'].includes(data.role)) return null;
    return { username: data.username, role: data.role };
  } catch {
    return null;
  }
}
