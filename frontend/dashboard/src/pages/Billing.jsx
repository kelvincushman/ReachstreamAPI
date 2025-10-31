/**
 * Billing Page
 * Manage credits, view pricing, and purchase credits
 */

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { CreditCard, Check, Zap } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const pricingTiers = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    credits: 100,
    pricePerK: 0,
    features: [
      '100 free credits',
      'No credit card required',
      'Access to all platforms',
      'Community support',
    ],
    buttonText: 'Current Plan',
    buttonDisabled: true,
  },
  {
    id: 'freelance',
    name: 'Freelance',
    price: 47,
    credits: 25000,
    pricePerK: 1.88,
    popular: true,
    features: [
      '25,000 API credits',
      'All social platforms',
      'Priority support',
      'Rate limit: 10 req/sec',
      '99.9% uptime SLA',
    ],
    buttonText: 'Buy Now',
    buttonDisabled: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: 497,
    credits: 500000,
    pricePerK: 0.99,
    features: [
      '500,000 API credits',
      'All social platforms',
      'Premium support',
      'Rate limit: 50 req/sec',
      '99.9% uptime SLA',
      'Dedicated account manager',
    ],
    buttonText: 'Buy Now',
    buttonDisabled: false,
  },
];

export default function Billing() {
  const { user } = useUser();
  const [balance, setBalance] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const token = await user?.getToken();

      const [balanceRes, purchasesRes] = await Promise.all([
        axios.get(`${API_URL}/api/credits/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/api/credits/purchases`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setBalance(balanceRes.data.data);
      setPurchaseHistory(purchasesRes.data.data);
    } catch (error) {
      toast.error('Failed to load billing data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (tier) => {
    try {
      const token = await user?.getToken();
      const response = await axios.post(
        `${API_URL}/api/credits/checkout`,
        { tier },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Redirect to Stripe checkout
      window.location.href = response.data.data.checkout_url;
    } catch (error) {
      toast.error('Failed to create checkout session');
      console.error(error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Credits</h1>
        <p className="mt-2 text-gray-600">
          Manage your credit balance and purchase more credits
        </p>
      </div>

      {/* Current Balance */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-8 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-100 text-sm font-medium mb-2">Current Balance</p>
            <p className="text-5xl font-bold">
              {loading ? '...' : balance?.credits_balance?.toLocaleString()}
            </p>
            <p className="text-indigo-100 text-sm mt-2">Credits Available</p>
          </div>
          <div className="bg-white/20 p-4 rounded-lg">
            <CreditCard className="h-12 w-12" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-indigo-100 text-sm">Total Purchased</p>
            <p className="text-2xl font-semibold">
              {balance?.total_credits_purchased?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-indigo-100 text-sm">Total Requests</p>
            <p className="text-2xl font-semibold">
              {balance?.total_api_requests?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Buy More Credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                tier.popular ? 'ring-2 ring-indigo-600' : ''
              }`}
            >
              {tier.popular && (
                <div className="bg-indigo-600 text-white text-center py-2 px-4 text-sm font-semibold">
                  <Zap className="h-4 w-4 inline mr-1" />
                  Most Popular
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${tier.price}
                  </span>
                  {tier.price > 0 && (
                    <span className="text-gray-600 ml-2">
                      (${tier.pricePerK}/1K)
                    </span>
                  )}
                </div>
                <p className="text-2xl font-semibold text-indigo-600 mb-6">
                  {tier.credits.toLocaleString()} Credits
                </p>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !tier.buttonDisabled && handlePurchase(tier.id)}
                  disabled={tier.buttonDisabled}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    tier.buttonDisabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : tier.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {tier.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase History */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Purchase History</h2>
        {purchaseHistory.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No purchases yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseHistory.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {purchase.tier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.credits_purchased.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(purchase.amount_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          purchase.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {purchase.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
