/**
 * Authentication Routes
 * Handles user registration, login, and account management
 */

const express = require('express');
const router = express.Router();
const { verifyClerkToken } = require('../middleware/auth');
const { query } = require('../config/database');

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', verifyClerkToken, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        credits_balance: user.credits_balance,
        total_credits_purchased: user.total_credits_purchased,
        total_api_requests: user.total_api_requests,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/auth/me
 * Update user profile
 */
router.patch('/me', verifyClerkToken, async (req, res) => {
  try {
    const { full_name } = req.body;
    const userId = req.user.id;

    const result = await query(
      'UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [full_name, userId]
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/auth/me
 * Delete user account
 */
router.delete('/me', verifyClerkToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      message: error.message,
    });
  }
});

module.exports = router;
