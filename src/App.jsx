import React, { useState, useEffect } from 'react';
import { Layout, ConfigProvider } from 'antd';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Policies from './pages/Policies';
import Logs from './pages/Logs';

const { Content } = Layout;

// Premium light mode styling tokens
const appTheme = {
  token: {
    colorPrimary: '#4f46e5', // Beautiful Indigo
    colorSuccess: '#10b981', // Emerald green
    colorWarning: '#f59e0b', // Amber yellow
    colorError: '#ef4444',   // Rose red
    colorInfo: '#3b82f6',    // Sky blue
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    colorBgLayout: '#f8fafc', // Very light grey bg
    colorBgContainer: '#ffffff', // Pure white card bg
    colorText: '#0f172a',    // Dark slate text
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

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activePolicy, setActivePolicy] = useState(null);

  useEffect(() => {
    fetchActivePolicy();
  }, []);

  const fetchActivePolicy = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/policies');
      if (response.ok) {
        const policies = await response.json();
        const active = policies.find(p => p.is_active);
        if (active) {
          setActivePolicy(active);
        }
      }
    } catch (err) {
      console.error('Failed to fetch active policy:', err);
    }
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'chat':
        return <Chat />;
      case 'policies':
        return <Policies onPolicyChanged={setActivePolicy} />;
      case 'logs':
        return <Logs />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ConfigProvider theme={appTheme}>
      <Layout style={{ minHeight: '100vh', flexDirection: 'row' }}>
        <Sidebar 
          currentTab={currentTab} 
          onChangeTab={setCurrentTab} 
          activePolicy={activePolicy} 
        />
        <Layout style={{ flex: 1, minWidth: 0 }}>
          <Content style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
