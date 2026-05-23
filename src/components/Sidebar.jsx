import React from 'react';
import { Menu, Layout, Typography, Space, Badge } from 'antd';
import { 
  DashboardOutlined, 
  MessageOutlined, 
  SafetyCertificateOutlined, 
  HistoryOutlined
} from '@ant-design/icons';

const { Sider } = Layout;
const { Title, Text } = Typography;

const Sidebar = ({ currentTab, onChangeTab, activePolicy }) => {
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined style={{ fontSize: '18px' }} />,
      label: 'Аналитическая панель',
    },
    {
      key: 'chat',
      icon: <MessageOutlined style={{ fontSize: '18px' }} />,
      label: 'Тестовый чат',
    },
    {
      key: 'policies',
      icon: <SafetyCertificateOutlined style={{ fontSize: '18px' }} />,
      label: 'Политики безопасности',
    },
    {
      key: 'logs',
      icon: <HistoryOutlined style={{ fontSize: '18px' }} />,
      label: 'Журнал и Аудит',
    },
  ];

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
          selectedKeys={[currentTab]}
          onClick={({ key }) => onChangeTab(key)}
          items={menuItems}
          style={{
            borderRight: 0,
          }}
          className="sidebar-menu"
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
