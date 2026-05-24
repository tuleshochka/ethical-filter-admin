import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, Spin, Alert, Empty, Typography, Space } from 'antd';
import { 
  FileTextOutlined, 
  ClockCircleOutlined, 
  EyeOutlined, 
  SafetyOutlined 
} from '@ant-design/icons';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import type { LogStats } from '../types.ts';
import { STRATEGY_HEX_COLORS, CATEGORY_COLORS, API_BASE } from '../types.ts';

const { Title, Paragraph } = Typography;

interface ChartItem {
  name: string;
  value: number;
  color: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/logs/stats`);
      if (!response.ok) {
        throw new Error('Не удалось загрузить статистику с сервера');
      }
      const data: LogStats = await response.json();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" tip="Загрузка аналитических данных..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Ошибка загрузки данных"
          description={error}
          type="error"
          showIcon
          action={
            <a onClick={fetchStats} style={{ textDecoration: 'underline' }}>
              Повторить попытку
            </a>
          }
        />
      </div>
    );
  }

  if (!stats || stats.total_requests === 0) {
    return (
      <div style={{ padding: '40px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Card style={{ width: 450, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Empty 
            description={
              <Space direction="vertical" size="small">
                <Title level={4}>Нет данных для отображения</Title>
                <Paragraph type="secondary">
                  История запросов пуста. Отправьте несколько сообщений через чат-клиент, чтобы увидеть графики на аналитической панели.
                </Paragraph>
              </Space>
            } 
          />
        </Card>
      </div>
    );
  }

  // Format strategy pie data
  const pieData: ChartItem[] = Object.entries(stats.strategy_distribution).map(([name, value]) => ({
    name,
    value,
    color: STRATEGY_HEX_COLORS[name] || '#64748b'
  }));

  // Format category bar data
  const barData: ChartItem[] = Object.entries(stats.category_distribution).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] || '#64748b'
  })).sort((a, b) => b.value - a.value);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>Аналитическая панель</Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Анализ проходящего трафика, безопасности запросов и задержек системы в реальном времени.
        </Paragraph>
      </div>

      {/* KPI Cards Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="Всего запросов"
              value={stats.total_requests}
              prefix={<FileTextOutlined style={{ color: '#4f46e5', marginRight: '8px' }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="Срабатываний политик"
              value={stats.violation_rate * 100}
              precision={1}
              valueStyle={{ color: stats.violation_rate > 0.3 ? '#ef4444' : '#1e293b', fontWeight: 700 }}
              prefix={<SafetyOutlined style={{ color: '#ef4444', marginRight: '8px' }} />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="Средняя задержка"
              value={stats.average_latency_ms}
              precision={0}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
              prefix={<ClockCircleOutlined style={{ color: '#3b82f6', marginRight: '8px' }} />}
              suffix=" мс"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="Обнаружено PII"
              value={stats.pii_detection_rate * 100}
              precision={1}
              valueStyle={{ color: '#10b981', fontWeight: 700 }}
              prefix={<EyeOutlined style={{ color: '#10b981', marginRight: '8px' }} />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row 1: Daily Volume */}
      {stats.daily_volume && stats.daily_volume.length > 0 && (
        <Card 
          title="Динамика обращений по дням" 
          bordered={false} 
          style={{ marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
        >
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart
                data={stats.daily_volume}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Area type="monotone" dataKey="count" name="Всего запросов" stroke="#4f46e5" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                <Area type="monotone" dataKey="violations" name="Фильтрации/Блокировки" stroke="#ef4444" fillOpacity={1} fill="url(#colorViolations)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Charts Row 2: Categories and Strategies */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title="Сработавшие категории риска (по максимальному скору)" 
            bordered={false}
            style={{ height: '400px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
          >
            {barData.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="value" name="Частота" radius={[0, 4, 4, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Нет данных по категориям" />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title="Распределение примененных стратегий" 
            bordered={false}
            style={{ height: '400px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
          >
            {pieData.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Нет данных по стратегиям" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
