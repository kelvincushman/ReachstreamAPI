/**
 * Overview Page
 * Dashboard home page with key metrics and quick actions
 */

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { CreditCard, Key, Activity, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Overview() {
  const { user } = useUser();
  const [stats, setStats] = useState({
    credits: 0,
    apiKeys: 0,
    requests: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = await user?.getToken();

      const [creditsRes, keysRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/credits/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/api/keys`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/api/scrape/stats`, {
          headers: { 'x-api-key': 'temp' }, // Will use actual key
        }).catch(() => ({ data: { data: { overall: { total_requests: 0, successful_requests: 0 } } } })),
      ]);

      const totalRequests = parseInt(statsRes.data.data?.overall?.total_requests || 0, 10);
      const successfulRequests = parseInt(statsRes.data.data?.overall?.successful_requests || 0, 10);

      setStats({
        credits: creditsRes.data.data.credits_balance,
        apiKeys: keysRes.data.count,
        requests: totalRequests,
        successRate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : 0,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      name: 'Credits Remaining',
      value: stats.credits.toLocaleString(),
      icon: CreditCard,
      color: 'text-indigo-600 bg-indigo-100',
    },
    {
      name: 'Active API Keys',
      value: stats.apiKeys,
      icon: Key,
      color: 'text-green-600 bg-green-100',
    },
    {
      name: 'Total Requests',
      value: stats.requests.toLocaleString(),
      icon: Activity,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      name: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName || 'Developer'}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here's an overview of your ReachstreamAPI usage
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {loading ? '...' : stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="/api-keys"
            className="flex items-center justify-center px-4 py-3 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
          >
            Create API Key
          </a>
          <a
            href="/billing"
            className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Buy Credits
          </a>
          <a
            href="/docs"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            View Documentation
          </a>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow p-8 text-white">
        <h2 className="text-2xl font-bold mb-4">Getting Started with ReachstreamAPI</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <p className="font-semibold">Create an API Key</p>
              <p className="text-sm text-indigo-100">
                Generate your first API key to start making requests
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <p className="font-semibold">Make Your First Request</p>
              <p className="text-sm text-indigo-100">
                Try our TikTok profile scraper with your API key
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <p className="font-semibold">Monitor Your Usage</p>
              <p className="text-sm text-indigo-100">
                Track requests and manage your credit balance
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <a
            href="/docs"
            className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-semibold"
          >
            Read Full Documentation →
          </a>
        </div>
      </div>
    </div>
  );
}
