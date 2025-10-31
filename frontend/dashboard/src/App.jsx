/**
 * ReachstreamAPI Developer Dashboard
 * Main application component
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Toaster } from 'react-hot-toast';

// Pages
import DashboardLayout from './components/DashboardLayout';
import Overview from './pages/Overview';
import ApiKeys from './pages/ApiKeys';
import Usage from './pages/Usage';
import Billing from './pages/Billing';
import Documentation from './pages/Documentation';
import Settings from './pages/Settings';

// Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <Router>
        <Toaster position="top-right" />

        <Routes>
          {/* Protected routes */}
          <Route
            path="/"
            element={
              <>
                <SignedIn>
                  <DashboardLayout />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            }
          >
            <Route index element={<Overview />} />
            <Route path="api-keys" element={<ApiKeys />} />
            <Route path="usage" element={<Usage />} />
            <Route path="billing" element={<Billing />} />
            <Route path="docs" element={<Documentation />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ClerkProvider>
  );
}

export default App;
