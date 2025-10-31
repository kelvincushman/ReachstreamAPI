/**
 * API Key Management Service
 * Handles generation, validation, and lifecycle of API keys
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { query } = require('../config/database');

const API_KEY_PREFIX = process.env.API_KEY_PREFIX || 'rsk_';
const API_KEY_LENGTH = parseInt(process.env.API_KEY_LENGTH || '32', 10);
const BCRYPT_ROUNDS = 10;

/**
 * Generate a secure random API key
 * @returns {string} Generated API key with prefix
 */
const generateApiKey = () => {
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH);
  const key = randomBytes.toString('base64url').slice(0, API_KEY_LENGTH);
  return `${API_KEY_PREFIX}${key}`;
};

/**
 * Create a new API key for a user
 * @param {string} userId - User ID
 * @param {string} name - Human-readable name for the key
 * @param {Date|null} expiresAt - Optional expiration date
 * @returns {Promise<object>} Created API key (includes plaintext key - only shown once!)
 */
const createApiKey = async (userId, name, expiresAt = null) => {
  // Generate the API key
  const apiKey = generateApiKey();
  const keyPrefix = apiKey.slice(0, 12); // First 12 chars for display

  // Hash the key for storage
  const keyHash = await bcrypt.hash(apiKey, BCRYPT_ROUNDS);

  // Store in database
  const result = await query(
    `INSERT INTO api_keys (user_id, key_hash, key_prefix, name, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, key_prefix, name, is_active, created_at, expires_at`,
    [userId, keyHash, keyPrefix, name, expiresAt]
  );

  const keyRecord = result.rows[0];

  // Return the key with plaintext (ONLY TIME IT'S VISIBLE!)
  return {
    ...keyRecord,
    api_key: apiKey, // Plaintext key - show to user immediately
    warning: 'Store this API key securely. It will not be shown again.',
  };
};

/**
 * List all API keys for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of API keys (without plaintext)
 */
const listApiKeys = async (userId) => {
  const result = await query(
    `SELECT id, key_prefix, name, is_active, last_used_at, total_requests, created_at, expires_at
     FROM api_keys
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows.map((key) => ({
    ...key,
    is_expired: key.expires_at && new Date(key.expires_at) < new Date(),
  }));
};

/**
 * Get details of a specific API key
 * @param {string} keyId - API key ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<object>} API key details
 */
const getApiKey = async (keyId, userId) => {
  const result = await query(
    `SELECT id, key_prefix, name, is_active, last_used_at, total_requests, created_at, expires_at
     FROM api_keys
     WHERE id = $1 AND user_id = $2`,
    [keyId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('API key not found');
  }

  const key = result.rows[0];
  return {
    ...key,
    is_expired: key.expires_at && new Date(key.expires_at) < new Date(),
  };
};

/**
 * Revoke (deactivate) an API key
 * @param {string} keyId - API key ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<object>} Updated API key
 */
const revokeApiKey = async (keyId, userId) => {
  const result = await query(
    `UPDATE api_keys
     SET is_active = false
     WHERE id = $1 AND user_id = $2
     RETURNING id, key_prefix, name, is_active`,
    [keyId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('API key not found');
  }

  return result.rows[0];
};

/**
 * Reactivate a previously revoked API key
 * @param {string} keyId - API key ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<object>} Updated API key
 */
const reactivateApiKey = async (keyId, userId) => {
  const result = await query(
    `UPDATE api_keys
     SET is_active = true
     WHERE id = $1 AND user_id = $2
     RETURNING id, key_prefix, name, is_active`,
    [keyId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('API key not found');
  }

  return result.rows[0];
};

/**
 * Delete an API key permanently
 * @param {string} keyId - API key ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<boolean>} Success status
 */
const deleteApiKey = async (keyId, userId) => {
  const result = await query(
    'DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id',
    [keyId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('API key not found');
  }

  return true;
};

/**
 * Update API key name
 * @param {string} keyId - API key ID
 * @param {string} userId - User ID (for authorization)
 * @param {string} name - New name
 * @returns {Promise<object>} Updated API key
 */
const updateApiKeyName = async (keyId, userId, name) => {
  const result = await query(
    `UPDATE api_keys
     SET name = $1
     WHERE id = $2 AND user_id = $3
     RETURNING id, key_prefix, name, is_active`,
    [name, keyId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('API key not found');
  }

  return result.rows[0];
};

/**
 * Get API key usage statistics
 * @param {string} keyId - API key ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<object>} Usage statistics
 */
const getApiKeyStats = async (keyId, userId) => {
  const result = await query(
    `SELECT
       ak.id,
       ak.key_prefix,
       ak.name,
       ak.total_requests,
       ak.last_used_at,
       COUNT(ar.id) as total_logged_requests,
       COUNT(CASE WHEN ar.success = true THEN 1 END) as successful_requests,
       COUNT(CASE WHEN ar.success = false THEN 1 END) as failed_requests,
       AVG(ar.response_time_ms) as avg_response_time_ms,
       MAX(ar.created_at) as last_request_at
     FROM api_keys ak
     LEFT JOIN api_requests ar ON ar.api_key_id = ak.id
     WHERE ak.id = $1 AND ak.user_id = $2
     GROUP BY ak.id, ak.key_prefix, ak.name, ak.total_requests, ak.last_used_at`,
    [keyId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('API key not found');
  }

  return result.rows[0];
};

module.exports = {
  createApiKey,
  listApiKeys,
  getApiKey,
  revokeApiKey,
  reactivateApiKey,
  deleteApiKey,
  updateApiKeyName,
  getApiKeyStats,
};
