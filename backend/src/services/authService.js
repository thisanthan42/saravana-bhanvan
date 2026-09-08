import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'saravana-bhavan-secure-manager-jwt-secret-key-2026';
const TOKEN_EXPIRY_SECONDS = 8 * 60 * 60; // 8 hours (standard management shift)

/**
 * Base64URL encoding helper (RFC 7519)
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64URL decoding helper
 */
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Secure Authentication & Token Service
 */
export const AuthService = {
  /**
   * Securely hash a password using random salt and memory-hard scrypt
   * @param {string} password 
   * @returns {string} Salted hash in format: scrypt$<salt_hex>$<hash_hex>
   */
  hashPassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Valid password string is required for hashing');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return `scrypt$${salt}$${derivedKey.toString('hex')}`;
  },

  /**
   * Verify password against stored salted hash using constant-time comparison
   * @param {string} password 
   * @param {string} storedHash 
   * @returns {boolean}
   */
  verifyPassword(password, storedHash) {
    if (!password || !storedHash || typeof storedHash !== 'string') {
      return false;
    }

    try {
      const parts = storedHash.split('$');
      if (parts.length !== 3 || parts[0] !== 'scrypt') {
        return false;
      }

      const salt = parts[1];
      const originalHash = Buffer.from(parts[2], 'hex');
      const testHash = crypto.scryptSync(password, salt, 64);

      if (originalHash.length !== testHash.length) {
        return false;
      }

      return crypto.timingSafeEqual(originalHash, testHash);
    } catch {
      return false;
    }
  },

  /**
   * Issue signed JSON Web Token (JWT) with HMAC-SHA256
   * @param {object} payload 
   * @param {number} expiresInSeconds 
   * @returns {string} Signed JWT
   */
  signToken(payload, expiresInSeconds = TOKEN_EXPIRY_SECONDS) {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(signatureInput)
      .digest();
    const encodedSignature = base64UrlEncode(signature);

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  },

  /**
   * Verify and decode a JWT
   * @param {string} token 
   * @returns {object} Decoded payload
   */
  verifyToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token is required');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token structure');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(signatureInput)
      .digest();
    const providedSignature = Buffer.from(
      encodedSignature.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );

    if (expectedSignature.length !== providedSignature.length) {
      throw new Error('Invalid token signature');
    }

    if (!crypto.timingSafeEqual(expectedSignature, providedSignature)) {
      throw new Error('Invalid token signature');
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      throw new Error('Token has expired');
    }

    return payload;
  },
};
