/**
 * Credit Management Service
 * Handles credit balance, purchases, and deductions
 */

const { query, transaction } = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Get user's current credit balance
 * @param {string} userId - User ID
 * @returns {Promise<object>} Credit balance info
 */
const getCreditBalance = async (userId) => {
  const result = await query(
    'SELECT credits_balance, total_credits_purchased, total_api_requests FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
};

/**
 * Deduct credits from user balance
 * @param {string} userId - User ID
 * @param {number} creditsToDeduct - Number of credits to deduct
 * @param {object} metadata - Transaction metadata
 * @returns {Promise<object>} Updated balance
 */
const deductCredits = async (userId, creditsToDeduct = 1, metadata = {}) => {
  return transaction(async (client) => {
    // Get current balance with row lock
    const userResult = await client.query(
      'SELECT credits_balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const currentBalance = userResult.rows[0].credits_balance;

    if (currentBalance < creditsToDeduct) {
      throw new Error('Insufficient credits');
    }

    const newBalance = currentBalance - creditsToDeduct;

    // Update user balance
    await client.query(
      'UPDATE users SET credits_balance = $1, total_api_requests = total_api_requests + 1, updated_at = NOW() WHERE id = $2',
      [newBalance, userId]
    );

    // Record transaction
    await client.query(
      `INSERT INTO credit_transactions (user_id, transaction_type, credits_change, credits_balance_after, reference_type, reference_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        'usage',
        -creditsToDeduct,
        newBalance,
        metadata.referenceType || 'api_request',
        metadata.referenceId || null,
        metadata.description || 'API request',
      ]
    );

    return {
      previous_balance: currentBalance,
      credits_deducted: creditsToDeduct,
      new_balance: newBalance,
    };
  });
};

/**
 * Add credits to user balance
 * @param {string} userId - User ID
 * @param {number} creditsToAdd - Number of credits to add
 * @param {object} metadata - Transaction metadata
 * @returns {Promise<object>} Updated balance
 */
const addCredits = async (userId, creditsToAdd, metadata = {}) => {
  return transaction(async (client) => {
    // Get current balance
    const userResult = await client.query(
      'SELECT credits_balance, total_credits_purchased FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const currentBalance = userResult.rows[0].credits_balance;
    const newBalance = currentBalance + creditsToAdd;

    // Update user balance
    await client.query(
      'UPDATE users SET credits_balance = $1, total_credits_purchased = total_credits_purchased + $2, updated_at = NOW() WHERE id = $3',
      [newBalance, creditsToAdd, userId]
    );

    // Record transaction
    await client.query(
      `INSERT INTO credit_transactions (user_id, transaction_type, credits_change, credits_balance_after, reference_type, reference_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        metadata.transactionType || 'purchase',
        creditsToAdd,
        newBalance,
        metadata.referenceType || 'stripe_payment',
        metadata.referenceId || null,
        metadata.description || 'Credit purchase',
      ]
    );

    return {
      previous_balance: currentBalance,
      credits_added: creditsToAdd,
      new_balance: newBalance,
    };
  });
};

/**
 * Create Stripe checkout session for credit purchase
 * @param {string} userId - User ID
 * @param {string} tier - Pricing tier (freelance, business, enterprise)
 * @param {string} email - User email
 * @returns {Promise<object>} Checkout session
 */
const createCheckoutSession = async (userId, tier, email) => {
  // Define pricing tiers
  const pricingTiers = {
    freelance: {
      amount: 4700, // $47.00 in cents
      credits: 25000,
      name: 'Freelance Plan - 25,000 Credits',
    },
    business: {
      amount: 49700, // $497.00 in cents
      credits: 500000,
      name: 'Business Plan - 500,000 Credits',
    },
  };

  const tierData = pricingTiers[tier];
  if (!tierData) {
    throw new Error('Invalid pricing tier');
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: tierData.name,
            description: `${tierData.credits.toLocaleString()} API request credits`,
          },
          unit_amount: tierData.amount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.API_BASE_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.API_BASE_URL}/dashboard?payment=cancelled`,
    customer_email: email,
    client_reference_id: userId,
    metadata: {
      user_id: userId,
      tier,
      credits: tierData.credits,
    },
  });

  return {
    session_id: session.id,
    checkout_url: session.url,
    amount: tierData.amount,
    credits: tierData.credits,
  };
};

/**
 * Handle successful Stripe payment
 * @param {object} session - Stripe checkout session
 * @returns {Promise<object>} Credit purchase record
 */
const handleSuccessfulPayment = async (session) => {
  const userId = session.client_reference_id || session.metadata.user_id;
  const tier = session.metadata.tier;
  const credits = parseInt(session.metadata.credits, 10);
  const amountCents = session.amount_total;

  return transaction(async (client) => {
    // Check if already processed
    const existing = await client.query(
      'SELECT id FROM credit_purchases WHERE stripe_payment_intent_id = $1',
      [session.payment_intent]
    );

    if (existing.rows.length > 0) {
      console.log('Payment already processed:', session.payment_intent);
      return existing.rows[0];
    }

    // Record credit purchase
    const purchaseResult = await client.query(
      `INSERT INTO credit_purchases (user_id, stripe_payment_intent_id, amount_cents, credits_purchased, tier, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [userId, session.payment_intent, amountCents, credits, tier, 'completed']
    );

    const purchase = purchaseResult.rows[0];

    // Add credits to user account
    await addCredits(userId, credits, {
      transactionType: 'purchase',
      referenceType: 'purchase_id',
      referenceId: purchase.id,
      description: `Purchased ${credits.toLocaleString()} credits - ${tier} plan`,
    });

    // Update Stripe customer ID if not set
    if (session.customer) {
      await client.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL',
        [session.customer, userId]
      );
    }

    return purchase;
  });
};

/**
 * Get credit transaction history
 * @param {string} userId - User ID
 * @param {number} limit - Number of records to retrieve
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Transaction history
 */
const getTransactionHistory = async (userId, limit = 50, offset = 0) => {
  const result = await query(
    `SELECT * FROM credit_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
};

/**
 * Get credit purchase history
 * @param {string} userId - User ID
 * @param {number} limit - Number of records to retrieve
 * @returns {Promise<Array>} Purchase history
 */
const getPurchaseHistory = async (userId, limit = 50) => {
  const result = await query(
    `SELECT * FROM credit_purchases
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
};

module.exports = {
  getCreditBalance,
  deductCredits,
  addCredits,
  createCheckoutSession,
  handleSuccessfulPayment,
  getTransactionHistory,
  getPurchaseHistory,
};
