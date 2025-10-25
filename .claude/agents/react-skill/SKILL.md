---
name: react-expert
description: Use for React development, hooks, state management, and component architecture. Invoke when building React applications, dashboards, or interactive UIs.
---

# React Expert Skill

## Overview

This skill provides expertise in building modern React applications with hooks, state management, performance optimization, and best practices for component architecture.

## Quick Start

### Create a Functional Component with Hooks

```jsx
import { useState, useEffect } from 'react';

function Dashboard() {
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchCredits();
  }, []);
  
  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits');
      const data = await response.json();
      setCredits(data.balance);
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="dashboard">
      <h1>Credit Balance: {credits}</h1>
    </div>
  );
}

export default Dashboard;
```

## Core Workflows

### Workflow 1: State Management with Context

For global state management:

```jsx
// contexts/AuthContext.jsx
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  
  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    setUser(data.user);
    setApiKey(data.apiKey);
  };
  
  const logout = () => {
    setUser(null);
    setApiKey(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, apiKey, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Workflow 2: Custom Hooks for Reusability

Create reusable logic with custom hooks:

```jsx
// hooks/useApi.js
import { useState, useEffect } from 'react';

export function useApi(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('API request failed');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [url]);
  
  return { data, loading, error };
}

// Usage
function UserProfile({ userId }) {
  const { data, loading, error } = useApi(`/api/users/${userId}`);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{data.name}</div>;
}
```

### Workflow 3: Form Handling with Controlled Components

```jsx
import { useState } from 'react';

function CreditPurchaseForm() {
  const [formData, setFormData] = useState({
    package: 'freelance',
    email: ''
  });
  const [errors, setErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const validate = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    return newErrors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      const response = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <select name="package" value={formData.package} onChange={handleChange}>
        <option value="freelance">Freelance - $47</option>
        <option value="business">Business - $497</option>
      </select>
      
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email"
      />
      {errors.email && <span className="error">{errors.email}</span>}
      
      <button type="submit">Purchase Credits</button>
    </form>
  );
}
```

## Best Practices

### Performance Optimization

Use React.memo for expensive components:

```jsx
import { memo } from 'react';

const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // Expensive rendering logic
  return <div>{data}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.data === nextProps.data;
});
```

Use useCallback and useMemo:

```jsx
import { useCallback, useMemo } from 'react';

function DataTable({ data, onRowClick }) {
  // Memoize expensive calculations
  const sortedData = useMemo(() => {
    return data.sort((a, b) => a.date - b.date);
  }, [data]);
  
  // Memoize callback functions
  const handleClick = useCallback((row) => {
    onRowClick(row);
  }, [onRowClick]);
  
  return (
    <table>
      {sortedData.map(row => (
        <tr key={row.id} onClick={() => handleClick(row)}>
          <td>{row.name}</td>
        </tr>
      ))}
    </table>
  );
}
```

### Error Boundaries

```jsx
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## Common Patterns

### Pattern 1: Data Fetching with Loading States

```jsx
function ApiRequestHistory() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  
  useEffect(() => {
    fetchRequests();
  }, [page]);
  
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/requests?page=${page}`);
      const data = await response.json();
      setRequests(data.requests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <div>
      <RequestTable requests={requests} />
      <Pagination page={page} onPageChange={setPage} />
    </div>
  );
}
```

### Pattern 2: Conditional Rendering

```jsx
function Dashboard({ user }) {
  if (!user) {
    return <LoginPrompt />;
  }
  
  return (
    <div className="dashboard">
      <Header user={user} />
      {user.credits > 0 ? (
        <ApiDashboard credits={user.credits} />
      ) : (
        <PurchasePrompt />
      )}
    </div>
  );
}
```

## Styling with Tailwind CSS

```jsx
function CreditCard({ credits, tier }) {
  return (
    <div className="max-w-sm rounded-lg overflow-hidden shadow-lg bg-white p-6">
      <div className="font-bold text-xl mb-2">{tier} Plan</div>
      <p className="text-gray-700 text-base">
        {credits.toLocaleString()} credits remaining
      </p>
      <div className="mt-4">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Purchase More
        </button>
      </div>
    </div>
  );
}
```

## Testing

For React component testing, see [TESTING.md](TESTING.md).

## Advanced Topics

For advanced patterns like code splitting, lazy loading, and Suspense, see [ADVANCED.md](ADVANCED.md).

