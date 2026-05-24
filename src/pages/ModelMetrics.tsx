import React, { useState, useEffect } from 'react';
import {
  Card, Col, Row, Statistic, Spin, Alert, Button, Progress, Table, Typography, Space, Tooltip, message, Badge
} from 'antd';
import {
  SafetyOutlined,
  RadarChartOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { API_BASE } from '../types.ts';

const { Title, Text, Paragraph } = Typography;

interface MetricsHistoryEntry {
  epoch: number;
  accuracy: number;
  f1_score: number;
}

interface ConfusionMatrixRow {
  category: string;
  predictions: Record<string, number>;
}

interface ModelMetricsData {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  metrics_history: MetricsHistoryEntry[];
  confusion_matrix: ConfusionMatrixRow[];
  reviewed_logs_count: number;
  correct_reviews_count: number;
  unreviewed_logs_count: number;
  retrain_needed: boolean;
  retrain_threshold: number;
  last_retrain_time: string | null;
  retrain_count: number;
}

const CATEGORY_NAMES: Record<string, string> = {
  HARMFUL: 'Вред',
  VIOLENCE: 'Насилие',
  HATE: 'Ненависть',
  MEDICAL: 'Медицина',
  LEGAL: 'Юр. конс.',
  PII: 'ПДн',
  MISINFO: 'Дезинф.',
  NSFW: 'Adult',
  SELFHARM: 'Суицид',
  SENSITIVE: 'Сенситив.',
};

const ModelMetrics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [data, setData] = useState<ModelMetricsData | null>(null);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE}/model/metrics`);
      if (response.ok) {
        const json = await response.json();
        setData(json);
      } else {
        message.error('Не удалось загрузить метрики модели.');
      }
    } catch (err) {
      console.error(err);
      message.error('Ошибка сети при запросе метрик модели.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const response = await fetch(`${API_BASE}/model/retrain`, { method: 'POST' });
      if (response.ok) {
        const json = await response.json();
        message.success(json.message || 'Переобучение успешно завершено!');
        await fetchMetrics();
      } else {
        message.error('Ошибка при запуске переобучения.');
      }
    } catch (err) {
      console.error(err);
      message.error('Сбой сети при переобучении модели.');
    } finally {
      setRetraining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <Spin size="large" />
        <Text type="secondary">Загрузка метрик качества классификатора...</Text>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message="Ошибка" description="Не удалось загрузить данные метрик" showIcon />
      </div>
    );
  }

  const categories = data.confusion_matrix.map(row => row.category);

  // Fix diagonal background color helper
  const matrixDataWithKeys = data.confusion_matrix.map((row, index) => {
    const updatedPredictions = { ...row.predictions };
    
    // We render table column by column, let's map it cleanly
    return {
      key: row.category,
      category: row.category,
      predictions: updatedPredictions,
      index: index
    };
  });

  const correctedColumns = [
    {
      title: 'Истинный класс \\ Предсказанный',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <Text strong>{CATEGORY_NAMES[cat] || cat}</Text>,
      width: 140,
      fixed: 'left' as const,
    },
    ...categories.map((colCat, colIndex) => ({
      title: CATEGORY_NAMES[colCat] || colCat,
      dataIndex: ['predictions', colCat],
      key: colCat,
      align: 'center' as const,
      render: (val: number, record: any) => {
        const isCorrect = record.index === colIndex;
        // Background color logic: Green for diagonal, purple/indigo for off-diagonal errors
        const baseColor = isCorrect ? '16, 185, 129' : '79, 70, 229';
        const opacity = val;
        return (
          <div
            style={{
              background: `rgba(${baseColor}, ${opacity})`,
              color: opacity > 0.45 ? '#ffffff' : '#0f172a',
              padding: '6px 2px',
              borderRadius: '4px',
              fontWeight: isCorrect && opacity > 0.5 ? '700' : '400',
              fontSize: '12px',
              border: isCorrect && opacity > 0.7 ? '1px solid #059669' : 'none'
            }}
          >
            {val !== undefined ? `${Math.round(val * 100)}%` : '0%'}
          </div>
        );
      },
    })),
  ];

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
          Метрики качества модели
        </Title>
        <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
          Анализ точности многоклассового классификатора рисков безопасности и управление Active Learning.
        </Paragraph>
      </div>

      {/* KPI Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={12} md={6}>
          <Card bordered={false} className="premium-card">
            <Statistic
              title={<span style={{ color: '#475569', fontWeight: 500 }}>Точность (Accuracy)</span>}
              value={data.accuracy * 100}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#4f46e5', fontWeight: 700 }}
              prefix={<SafetyOutlined style={{ marginRight: 8, color: '#4f46e5' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card bordered={false} className="premium-card">
            <Statistic
              title={<span style={{ color: '#475569', fontWeight: 500 }}>Precision (Точность рисков)</span>}
              value={data.precision * 100}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#10b981', fontWeight: 700 }}
              prefix={<CheckCircleOutlined style={{ marginRight: 8, color: '#10b981' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card bordered={false} className="premium-card">
            <Statistic
              title={<span style={{ color: '#475569', fontWeight: 500 }}>Recall (Полнота обнаружения)</span>}
              value={data.recall * 100}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#f59e0b', fontWeight: 700 }}
              prefix={<ExclamationCircleOutlined style={{ marginRight: 8, color: '#f59e0b' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card bordered={false} className="premium-card">
            <Statistic
              title={<span style={{ color: '#475569', fontWeight: 500 }}>F1-Мера (F1-Score)</span>}
              value={data.f1_score * 100}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#3b82f6', fontWeight: 700 }}
              prefix={<RadarChartOutlined style={{ marginRight: 8, color: '#3b82f6' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Grid */}
      <Row gutter={[16, 16]}>
        {/* Confusion Matrix Heatmap */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <BarChartOutlined style={{ color: '#4f46e5' }} />
                <span>Матрица ошибок (Confusion Matrix)</span>
              </Space>
            }
            bordered={false}
            className="premium-card"
          >
            <div style={{ overflowX: 'auto' }}>
              <Table
                dataSource={matrixDataWithKeys}
                columns={correctedColumns}
                pagination={false}
                size="small"
                bordered
                scroll={{ x: 'max-content' }}
              />
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <Space>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(16, 185, 129, 0.8)' }} />
                <Text style={{ fontSize: '12px' }}>Верное срабатывание (True Positive)</Text>
              </Space>
              <Space>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(79, 70, 229, 0.5)' }} />
                <Text style={{ fontSize: '12px' }}>Перекрестные ошибки классификатора</Text>
              </Space>
            </div>
          </Card>
        </Col>

        {/* Retraining & Active Learning Controller */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <SyncOutlined spin={retraining} style={{ color: '#4f46e5' }} />
                <span>Центр управления обучением</span>
              </Space>
            }
            bordered={false}
            className="premium-card"
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>КОНТУР ОБРАТНОЙ СВЯЗИ</Text>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <Text>Проверенные записи (аудит):</Text>
                  <Text strong>{data.reviewed_logs_count}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <Text>Верные вердикты классификатора:</Text>
                  <Text strong style={{ color: '#10b981' }}>{data.correct_reviews_count}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <Text>Ожидает разметки:</Text>
                  <Text strong>{data.unreviewed_logs_count}</Text>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text style={{ fontSize: '13px' }}>Готовность к переобучению:</Text>
                  <Text strong style={{ color: data.retrain_needed ? '#f59e0b' : '#10b981' }}>
                    {data.unreviewed_logs_count} / {data.retrain_threshold}
                  </Text>
                </div>
                <Progress
                  percent={Math.min(100, Math.round((data.unreviewed_logs_count / data.retrain_threshold) * 100))}
                  status={data.retrain_needed ? "active" : "normal"}
                  strokeColor={data.retrain_needed ? '#f59e0b' : '#4f46e5'}
                />
              </div>

              {data.retrain_needed ? (
                <Alert
                  type="warning"
                  showIcon
                  message="Рекомендуется переобучение"
                  description={`Накоплено достаточно неразмеченных записей (${data.unreviewed_logs_count} из необходимых ${data.retrain_threshold}) для запуска сессии обучения.`}
                />
              ) : (
                <Alert
                  type="info"
                  showIcon
                  message="Модель актуальна"
                  description="Сбор данных продолжается. Количество новых записей пока не превысило порог."
                />
              )}
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <Button
                type="primary"
                icon={<SyncOutlined spin={retraining} />}
                loading={retraining}
                block
                size="large"
                onClick={handleRetrain}
                style={{
                  height: '45px',
                  fontWeight: 600,
                  boxShadow: '0 4px 10px rgba(79, 70, 229, 0.15)',
                  backgroundColor: '#4f46e5'
                }}
              >
                {retraining ? 'Идет переобучение...' : 'Запустить переобучение'}
              </Button>

              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                {data.last_retrain_time ? (
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    Последнее обучение: {data.last_retrain_time} (Сессий: {data.retrain_count})
                  </Text>
                ) : (
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    Модель в исходном состоянии (baseline)
                  </Text>
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Epochs / History chart */}
      <Row>
        <Col span={24}>
          <Card
            title={
              <Space>
                <HistoryOutlined style={{ color: '#4f46e5' }} />
                <span>История качества по эпохам переобучения (Active Learning Curve)</span>
              </Space>
            }
            bordered={false}
            className="premium-card"
          >
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.metrics_history}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="epoch" tickFormatter={(v) => `Эпоха ${v}`} />
                  <YAxis domain={[0.5, 1.0]} />
                  <ChartTooltip formatter={(value: any) => `${(value * 100).toFixed(1)}%`} />
                  <Legend />
                  <Line
                    name="Точность (Accuracy)"
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    name="F1-Score"
                    type="monotone"
                    dataKey="f1_score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ModelMetrics;
