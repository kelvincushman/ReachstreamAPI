-- ReachstreamAPI Database Schema
-- Migration: 001_initial_schema
-- Description: Create core tables for users, credits, API keys, and request tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (synced with Clerk)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    credits_balance INTEGER DEFAULT 100, -- Free trial credits
    total_credits_purchased INTEGER DEFAULT 0,
    total_api_requests INTEGER DEFAULT 0,
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, freelance, business, enterprise
    subscription_status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) UNIQUE NOT NULL, -- bcrypt hash of the API key
    key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for display (e.g., rsk_12345678...)
    name VARCHAR(255) NOT NULL, -- User-friendly name for the key
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    total_requests INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Credit Purchases table
CREATE TABLE credit_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_invoice_id VARCHAR(255),
    amount_cents INTEGER NOT NULL, -- Amount in cents (e.g., 4700 = $47.00)
    credits_purchased INTEGER NOT NULL, -- Number of credits purchased
    credits_per_dollar DECIMAL(10, 2), -- Rate at time of purchase
    tier VARCHAR(50) NOT NULL, -- freelance, business, enterprise
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
    payment_method VARCHAR(50), -- card, bank_transfer, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- API Requests table (for tracking and analytics)
CREATE TABLE api_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL, -- e.g., /api/tiktok/profile
    platform VARCHAR(50) NOT NULL, -- tiktok, instagram, youtube, etc.
    request_type VARCHAR(50) NOT NULL, -- profile, feed, hashtag, etc.
    request_params JSONB, -- Store request parameters as JSON
    response_status INTEGER, -- HTTP status code
    response_time_ms INTEGER, -- Response time in milliseconds
    credits_used INTEGER DEFAULT 1,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Credit Transactions table (ledger for credit changes)
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- purchase, usage, refund, bonus
    credits_change INTEGER NOT NULL, -- Positive for additions, negative for usage
    credits_balance_after INTEGER NOT NULL,
    reference_type VARCHAR(50), -- purchase_id, request_id, etc.
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

CREATE INDEX idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX idx_credit_purchases_stripe_payment ON credit_purchases(stripe_payment_intent_id);
CREATE INDEX idx_credit_purchases_status ON credit_purchases(status);

CREATE INDEX idx_api_requests_user_id ON api_requests(user_id);
CREATE INDEX idx_api_requests_api_key_id ON api_requests(api_key_id);
CREATE INDEX idx_api_requests_platform ON api_requests(platform);
CREATE INDEX idx_api_requests_created_at ON api_requests(created_at DESC);
CREATE INDEX idx_api_requests_success ON api_requests(success);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts synced with Clerk authentication';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access';
COMMENT ON TABLE credit_purchases IS 'Credit purchase transactions via Stripe';
COMMENT ON TABLE api_requests IS 'Log of all API requests for analytics and billing';
COMMENT ON TABLE credit_transactions IS 'Ledger of all credit balance changes';
