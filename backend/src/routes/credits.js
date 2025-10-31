/**
 * Credits Routes
 * Handles credit balance, purchases, and transaction history
 */

const express = require('express');
const router = express.Router();
const { verifyClerkToken } = require('../middleware/auth');
const creditService = require('../services/creditService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * GET /api/credits/balance
 * Get current credit balance
 */
router.get('/balance', verifyClerkToken, async (req, res) => {
  try {
    const balance = await creditService.getCreditBalance(req.user.id);

    res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    console.error('Get credit balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit balance',
      message: error.message,
    });
  }
});

/**
 * GET /api/credits/history
 * Get credit transaction history
 */
router.get('/history', verifyClerkToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const offset = parseInt(req.query.offset || '0', 10);

    const history = await creditService.getTransactionHistory(req.user.id, limit, offset);

    res.json({
      success: true,
      data: history,
      pagination: {
        limit,
        offset,
        count: history.length,
      },
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction history',
      message: error.message,
    });
  }
});

/**
 * GET /api/credits/purchases
 * Get credit purchase history
 */
router.get('/purchases', verifyClerkToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const purchases = await creditService.getPurchaseHistory(req.user.id, limit);

    res.json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    console.error('Get purchase history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase history',
      message: error.message,
    });
  }
});

/**
 * POST /api/credits/checkout
 * Create Stripe checkout session for credit purchase
 */
router.post('/checkout', verifyClerkToken, async (req, res) => {
  try {
    const { tier } = req.body;

    if (!tier || !['freelance', 'business'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier. Must be "freelance" or "business"',
      });
    }

    const session = await creditService.createCheckoutSession(
      req.user.id,
      tier,
      req.user.email
    );

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
      message: error.message,
    });
  }
});

/**
 * POST /api/credits/webhook
 * Stripe webhook handler for payment events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    console.log('Stripe webhook received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await creditService.handleSuccessfulPayment(session);
        console.log('Payment successful:', session.id);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('Payment intent succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.error('Payment failed:', paymentIntent.id);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      success: false,
      error: 'Webhook error',
      message: error.message,
    });
  }
});

/**
 * GET /api/credits/pricing
 * Get pricing tiers
 */
router.get('/pricing', async (req, res) => {
  res.json({
    success: true,
    data: {
      tiers: [
        {
          id: 'free',
          name: 'Free Trial',
          price: 0,
          credits: 100,
          price_per_1k: 0,
          features: ['100 free credits', 'No credit card required', 'Access to all platforms'],
        },
        {
          id: 'freelance',
          name: 'Freelance',
          price: 47,
          credits: 25000,
          price_per_1k: 1.88,
          features: ['25,000 API credits', 'Priority support', 'Rate limit: 10 req/sec'],
        },
        {
          id: 'business',
          name: 'Business',
          price: 497,
          credits: 500000,
          price_per_1k: 0.99,
          features: ['500,000 API credits', 'Premium support', 'Rate limit: 50 req/sec', 'Dedicated account manager'],
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          price: 'Custom',
          credits: '1M+',
          price_per_1k: 'Negotiable',
          features: ['Custom credit packages', '24/7 support', 'Unlimited rate limits', 'SLA guarantee', 'Custom integrations'],
        },
      ],
    },
  });
});

module.exports = router;
