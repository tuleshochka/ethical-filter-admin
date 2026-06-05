import React from 'react';
import { Menu, Layout, Typography, Space, Badge } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  DashboardOutlined, 
  SafetyCertificateOutlined, 
  HistoryOutlined,
  AppstoreOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { Policy } from '../types.ts';
import { API_BASE } from '../types.ts';

const { Sider } = Layout;
const { Title, Text } = Typography;

interface SidebarProps {
  activePolicy: Policy | null;
  role: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activePolicy, role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreviewedCount, setUnreviewedCount] = React.useState(0);

  const fetchUnreviewedCount = async () => {
    try {
      const response = await fetch(`${API_BASE}/model/metrics`);
      if (response.ok) {
        const json = await response.json();
        setUnreviewedCount(json.unreviewed_logs_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch unreviewed count:', err);
    }
  };

  React.useEffect(() => {
    fetchUnreviewedCount();
    const interval = setInterval(fetchUnreviewedCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const baseMenuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined style={{ fontSize: '18px' }} />,
      label: 'Аналитическая панель',
    },
    {
      key: '/policies',
      icon: <SafetyCertificateOutlined style={{ fontSize: '18px' }} />,
      label: 'Политики безопасности',
    },
    {
      key: '/categories',
      icon: <AppstoreOutlined style={{ fontSize: '18px' }} />,
      label: 'Категории риска',
    },
    {
      key: '/logs',
      icon: <HistoryOutlined style={{ fontSize: '18px' }} />,
      label: (
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
          <span>Журнал и Аудит</span>
          {unreviewedCount > 0 && (
            <Badge 
              count={unreviewedCount} 
              style={{ backgroundColor: '#f59e0b', color: '#ffffff', boxShadow: 'none' }} 
              size="small"
            />
          )}
        </span>
      ),
    },
    {
      key: '/model',
      icon: <ExperimentOutlined style={{ fontSize: '18px' }} />,
      label: 'Метрики модели',
    },
  ];

  const menuItems = baseMenuItems.filter(item => {
    if (item?.key === '/policies' || item?.key === '/categories' || item?.key === '/model') {
      return role === 'admin';
    }
    return true;
  });

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  return (
    <Sider
      width={260}
      theme="light"
      style={{
        borderRight: '1px solid #f0f2f5',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
        boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
        zIndex: 10
      }}
    >
      <div style={{ padding: '24px 16px', borderBottom: '1px solid #f5f5f5' }}>
        <Space size="middle">
          <SafetyCertificateOutlined style={{ fontSize: '28px', color: '#4f46e5' }} />
          <div>
            <Title level={4} style={{ margin: 0, color: '#0f172a', fontWeight: 700, fontSize: '16px' }}>
              Ethical Filter
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Контекстный шлюз безопасности
            </Text>
          </div>
        </Space>
      </div>

      <div style={{ flex: 1, padding: '16px 0' }}>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </div>

      {activePolicy && (
        <div style={{ 
          padding: '20px 24px', 
          borderTop: '1px solid #f5f5f5', 
          backgroundColor: '#fafafa',
          margin: '12px',
          borderRadius: '8px'
        }}>
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Активная политика
            </Text>
            <Space size={6} align="center">
              <Badge status="processing" color="#10b981" />
              <Text strong style={{ fontSize: '13px', color: '#1e293b' }}>
                {activePolicy.name}
              </Text>
            </Space>
            {activePolicy.description && (
              <Text type="secondary" style={{ fontSize: '11px', lineHeight: '1.2', display: 'block', marginTop: '4px' }}>
                {activePolicy.description}
              </Text>
            )}
          </Space>
        </div>
      )}

    </Sider>
  );
};

export default Sidebar;
