/**
 * API Keys Routes
 * Handles API key creation, management, and lifecycle
 */

const express = require('express');
const router = express.Router();
const { verifyClerkToken } = require('../middleware/auth');
const apiKeyService = require('../services/apiKeyService');

/**
 * POST /api/keys
 * Create a new API key
 */
router.post('/', verifyClerkToken, async (req, res) => {
  try {
    const { name, expires_at } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'API key name is required',
      });
    }

    const expiresAt = expires_at ? new Date(expires_at) : null;
    const apiKey = await apiKeyService.createApiKey(req.user.id, name, expiresAt);

    res.status(201).json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create API key',
      message: error.message,
    });
  }
});

/**
 * GET /api/keys
 * List all API keys for the user
 */
router.get('/', verifyClerkToken, async (req, res) => {
  try {
    const keys = await apiKeyService.listApiKeys(req.user.id);

    res.json({
      success: true,
      data: keys,
      count: keys.length,
    });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list API keys',
      message: error.message,
    });
  }
});

/**
 * GET /api/keys/:keyId
 * Get details of a specific API key
 */
router.get('/:keyId', verifyClerkToken, async (req, res) => {
  try {
    const key = await apiKeyService.getApiKey(req.params.keyId, req.user.id);

    res.json({
      success: true,
      data: key,
    });
  } catch (error) {
    console.error('Get API key error:', error);
    const statusCode = error.message === 'API key not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch API key',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/keys/:keyId
 * Update API key (name only)
 */
router.patch('/:keyId', verifyClerkToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'API key name is required',
      });
    }

    const key = await apiKeyService.updateApiKeyName(req.params.keyId, req.user.id, name);

    res.json({
      success: true,
      data: key,
    });
  } catch (error) {
    console.error('Update API key error:', error);
    const statusCode = error.message === 'API key not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to update API key',
      message: error.message,
    });
  }
});

/**
 * POST /api/keys/:keyId/revoke
 * Revoke (deactivate) an API key
 */
router.post('/:keyId/revoke', verifyClerkToken, async (req, res) => {
  try {
    const key = await apiKeyService.revokeApiKey(req.params.keyId, req.user.id);

    res.json({
      success: true,
      data: key,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    const statusCode = error.message === 'API key not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to revoke API key',
      message: error.message,
    });
  }
});

/**
 * POST /api/keys/:keyId/reactivate
 * Reactivate a previously revoked API key
 */
router.post('/:keyId/reactivate', verifyClerkToken, async (req, res) => {
  try {
    const key = await apiKeyService.reactivateApiKey(req.params.keyId, req.user.id);

    res.json({
      success: true,
      data: key,
      message: 'API key reactivated successfully',
    });
  } catch (error) {
    console.error('Reactivate API key error:', error);
    const statusCode = error.message === 'API key not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to reactivate API key',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/keys/:keyId
 * Delete an API key permanently
 */
router.delete('/:keyId', verifyClerkToken, async (req, res) => {
  try {
    await apiKeyService.deleteApiKey(req.params.keyId, req.user.id);

    res.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    const statusCode = error.message === 'API key not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to delete API key',
      message: error.message,
    });
  }
});

/**
 * GET /api/keys/:keyId/stats
 * Get usage statistics for an API key
 */
router.get('/:keyId/stats', verifyClerkToken, async (req, res) => {
  try {
    const stats = await apiKeyService.getApiKeyStats(req.params.keyId, req.user.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get API key stats error:', error);
    const statusCode = error.message === 'API key not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch API key statistics',
      message: error.message,
    });
  }
});

module.exports = router;
