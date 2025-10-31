/**
 * API Keys Page
 * Manage API keys for accessing the ReachstreamAPI
 */

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Key, Plus, Copy, Eye, EyeOff, Trash2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ApiKeys() {
  const { user } = useUser();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState(new Set());

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const token = await user?.getToken();
      const response = await axios.get(`${API_URL}/api/keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApiKeys(response.data.data);
    } catch (error) {
      toast.error('Failed to load API keys');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }

    try {
      const token = await user?.getToken();
      const response = await axios.post(
        `${API_URL}/api/keys`,
        { name: newKeyName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCreatedKey(response.data.data);
      setApiKeys([response.data.data, ...apiKeys]);
      setNewKeyName('');
      toast.success('API key created successfully!');
    } catch (error) {
      toast.error('Failed to create API key');
      console.error(error);
    }
  };

  const deleteApiKey = async (keyId) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const token = await user?.getToken();
      await axios.delete(`${API_URL}/api/keys/${keyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setApiKeys(apiKeys.filter((key) => key.id !== keyId));
      toast.success('API key deleted');
    } catch (error) {
      toast.error('Failed to delete API key');
      console.error(error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const toggleKeyVisibility = (keyId) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="mt-2 text-gray-600">
            Manage your API keys for accessing ReachstreamAPI
          </p>
        </div>
        <button
          onClick={() => setShowNewKeyModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          Create New Key
        </button>
      </div>

      {/* New Key Modal */}
      {showNewKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New API Key</h2>

            {!createdKey ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production Key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowNewKeyModal(false);
                      setNewKeyName('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createApiKey}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Create Key
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="font-semibold text-green-900">API Key Created!</p>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    ⚠️ Copy this key now. You won't be able to see it again!
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={createdKey.api_key}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-lg font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(createdKey.api_key)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNewKeyModal(false);
                    setCreatedKey(null);
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* API Keys List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No API Keys Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first API key to start using ReachstreamAPI
          </p>
          <button
            onClick={() => setShowNewKeyModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            <Plus className="h-5 w-5" />
            Create Your First Key
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{key.name}</h3>
                    {key.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <code className="px-2 py-1 bg-gray-100 text-gray-800 rounded font-mono text-sm">
                      {key.key_prefix}...
                    </code>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                    <span>Requests: {key.total_requests?.toLocaleString() || 0}</span>
                    {key.last_used_at && (
                      <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteApiKey(key.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete API key"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use Your API Key</h3>
        <p className="text-blue-800 mb-4">
          Include your API key in the <code className="px-2 py-1 bg-blue-100 rounded">x-api-key</code> header of your requests:
        </p>
        <pre className="bg-blue-900 text-blue-50 p-4 rounded-lg overflow-x-auto text-sm">
{`curl -X GET "https://api.reachstream.com/api/scrape/tiktok/profile?username=charlidamelio" \\
  -H "x-api-key: rsk_your_api_key_here"`}
        </pre>
      </div>
    </div>
  );
}
