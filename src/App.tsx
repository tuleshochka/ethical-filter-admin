import React, { useState, useEffect } from 'react';
import { Layout, ConfigProvider } from 'antd';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Policies from './pages/Policies.tsx';
import Logs from './pages/Logs.tsx';
import Categories from './pages/Categories.tsx';
import ModelMetrics from './pages/ModelMetrics.tsx';
import type { ThemeConfig } from 'antd';
import type { Policy } from './types.ts';
import { API_BASE } from './types.ts';

const { Content } = Layout;

import Login from './pages/Login.tsx';

// Fetch interceptor to inject Bearer token automatically for API calls
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const token = localStorage.getItem('admin_token');
  const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
  const isApiCall = url.includes('/api/v1') && !url.includes('/auth/login');

  if (token && isApiCall) {
    init = init || {};
    init.headers = {
      ...init.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  const response = await originalFetch(input, init);

  if (response.status === 401 && isApiCall) {
    localStorage.removeItem('admin_token');
    window.location.reload();
  }

  return response;
};

// Premium light mode styling tokens
const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#4f46e5',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    colorBgLayout: '#f8fafc',
    colorBgContainer: '#ffffff',
    colorText: '#0f172a',
    colorTextSecondary: '#475569',
  },
  components: {
    Layout: {
      bodyBg: '#f8fafc',
      headerBg: '#ffffff',
      siderBg: '#ffffff',
    },
    Menu: {
      itemSelectedColor: '#4f46e5',
      itemSelectedBg: '#e0e7ff',
      itemColor: '#475569',
      itemHoverColor: '#4f46e5',
      itemHoverBg: '#f1f5f9',
    },
    Card: {
      headerBg: '#ffffff',
    }
  }
};

function App(): React.ReactElement {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);

  useEffect(() => {
    if (token) {
      fetchActivePolicy();
    }
  }, [token]);

  const fetchActivePolicy = async () => {
    try {
      const response = await fetch(`${API_BASE}/policies`);
      if (response.ok) {
        const policies: Policy[] = await response.json();
        const active = policies.find(p => p.is_active);
        if (active) {
          setActivePolicy(active);
        }
      }
    } catch (err) {
      console.error('Failed to fetch active policy:', err);
    }
  };

  if (!token) {
    return (
      <ConfigProvider theme={appTheme}>
        <Login onLoginSuccess={(t) => setToken(t)} />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={appTheme}>
      <Layout style={{ minHeight: '100vh', flexDirection: 'row' }}>
        <Sidebar activePolicy={activePolicy} />
        <Layout style={{ flex: 1, minWidth: 0 }}>
          <Content style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/policies" element={<Policies onPolicyChanged={setActivePolicy} />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/model" element={<ModelMetrics />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
