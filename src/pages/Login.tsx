import React, { useState } from 'react';
import { Card, Input, Button, Form, Typography, Space, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { API_BASE } from '../types.ts';

const { Title, Text } = Typography;

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: values.password }),
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('admin_token', data.token);
        onLoginSuccess(data.token);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.detail || 'Неверный пароль');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)',
      padding: '24px'
    }}>
      <Card style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(16px)',
      }} styles={{ body: { padding: '40px 32px' } }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)',
              display: 'inline-flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 8px 16px rgba(79, 70, 229, 0.3)',
              marginBottom: '16px'
            }}>
              <LockOutlined style={{ fontSize: '32px', color: '#ffffff' }} />
            </div>
            <Title level={2} style={{ color: '#ffffff', margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>
              Вход в панель
            </Title>
            <Text style={{ color: '#94a3b8', fontSize: '14px' }}>
              Введите пароль администратора шлюза
            </Text>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#fca5a5'
              }}
            />
          )}

          <Form name="login_form" onFinish={onFinish} layout="vertical" requiredMark={false}>
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Пожалуйста, введите пароль' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#64748b' }} />}
                placeholder="Пароль администратора"
                size="large"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff'
                }}
              />
            </Form.Item>

            <Form.Item style={{ margin: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                block
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '16px',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }}
              >
                Войти
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
