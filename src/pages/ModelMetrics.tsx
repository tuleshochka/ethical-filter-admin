import React, { useState, useEffect } from 'react';
import {
  Card, Col, Row, Statistic, Spin, Alert, Button, Progress, Table, Typography, Space, Tooltip, message, Badge, Slider, Divider
} from 'antd';
import {
  SafetyOutlined,
  RadarChartOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
  HistoryOutlined,
  SlidersOutlined,
  DownloadOutlined
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
  export_recommended: boolean;
  export_threshold: number;
  last_retrain_time: string | null;
  retrain_count: number;
}

const CATEGORY_NAMES: Record<string, string> = {
  HARMFUL: 'HARMFUL',
  VIOLENCE: 'VIOLENCE',
  HATE: 'HATE',
  MEDICAL: 'MEDICAL',
  LEGAL: 'LEGAL',
  ILLEGAL: 'ILLEGAL',
  PII: 'PII',
  NSFW: 'NSFW',
  SELFHARM: 'SELFHARM',
  SENSITIVE: 'SENSITIVE',
};

const ModelMetrics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<ModelMetricsData | null>(null);
  const [cascadeThreshold, setCascadeThreshold] = useState<number>(0.15);
  const [updatingThreshold, setUpdatingThreshold] = useState<boolean>(false);
  const [perClassThresholds, setPerClassThresholds] = useState<Record<string, number>>({
    HARMFUL: 0.10,
    VIOLENCE: 0.05,
    HATE: 0.10,
    NSFW: 0.05,
    SELFHARM: 0.005,
    SENSITIVE: 0.40,
    MEDICAL: 0.001,
    LEGAL: 0.001,
    ILLEGAL: 0.001,
    PII: 0.001
  });
  const [savingPerClass, setSavingPerClass] = useState<boolean>(false);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE}/model/metrics`);
      if (response.ok) {
        const json = await response.json();
        setData(json);
      } else {
        message.error('Не удалось загрузить метрики модели.');
      }
      
      const thresholdResponse = await fetch(`${API_BASE}/model/cascade-threshold`);
      if (thresholdResponse.ok) {
        const thresholdJson = await thresholdResponse.json();
        setCascadeThreshold(thresholdJson.cascade_threshold);
        if (thresholdJson.per_class_thresholds) {
          setPerClassThresholds(thresholdJson.per_class_thresholds);
        }
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

  const handleSavePerClassThresholds = async () => {
    setSavingPerClass(true);
    try {
      const response = await fetch(`${API_BASE}/model/cascade-threshold/per-class`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ thresholds: perClassThresholds }),
      });
      if (response.ok) {
        const json = await response.json();
        setPerClassThresholds(json.per_class_thresholds);
        message.success('Поклассовые пороги успешно сохранены!');
      } else {
        message.error('Не удалось сохранить поклассовые пороги.');
      }
    } catch (err) {
      console.error(err);
      message.error('Сбой сети при сохранении порогов.');
    } finally {
      setSavingPerClass(false);
    }
  };

  const handleThresholdChange = async (val: number) => {
    setUpdatingThreshold(true);
    try {
      const response = await fetch(`${API_BASE}/model/cascade-threshold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threshold: val }),
      });
      if (response.ok) {
        const json = await response.json();
        setCascadeThreshold(json.cascade_threshold);
        message.success(`Порог каскадного переключения успешно изменен на ${json.cascade_threshold}`);
      } else {
        message.error('Не удалось обновить порог каскада.');
      }
    } catch (err) {
      console.error(err);
      message.error('Сбой сети при изменении порога.');
    } finally {
      setUpdatingThreshold(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API_BASE}/logs/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audited_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        message.success('Размеченные данные успешно экспортированы');
      } else {
        message.error('Не удалось выполнить экспорт данных.');
      }
    } catch (err) {
      console.error(err);
      message.error('Ошибка сети при экспорте данных.');
    } finally {
      setExporting(false);
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
              title={<span style={{ color: '#475569', fontWeight: 500 }}>Accuracy</span>}
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
              title={<span style={{ color: '#475569', fontWeight: 500 }}>Precision</span>}
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
              title={<span style={{ color: '#475569', fontWeight: 500 }}>Recall</span>}
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
              title={<span style={{ color: '#475569', fontWeight: 500 }}>F₁-Score</span>}
              value={data.f1_score * 100}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#ec4899', fontWeight: 700 }}
              prefix={<RadarChartOutlined style={{ marginRight: 8, color: '#ec4899' }} />}
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
                <span>Confusion Matrix</span>
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
                <Text style={{ fontSize: '12px' }}>True Positive</Text>
              </Space>
              <Space>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(79, 70, 229, 0.5)' }} />
                <Text style={{ fontSize: '12px' }}>Ошибка классификации</Text>
              </Space>
            </div>
          </Card>
        </Col>

        {/* Retraining & Active Learning Controller Stack */}
        <Col xs={24} lg={8} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card
            title={
              <Space>
                <DownloadOutlined style={{ color: '#4f46e5' }} />
                <span>Экспорт данных для дообучения</span>
              </Space>
            }
            bordered={false}
            className="premium-card"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>КОНТУР ОБРАТНОЙ СВЯЗИ</Text>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <Text>Проверенные записи аудита:</Text>
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
                  <Text style={{ fontSize: '13px' }}>Накоплено размеченных записей:</Text>
                  <Text strong style={{ color: data.reviewed_logs_count > 0 ? '#10b981' : '#94a3b8' }}>
                    {data.reviewed_logs_count}
                  </Text>
                </div>
              </div>

              {data.export_recommended ? (
                <Alert
                  type="warning"
                  showIcon
                  message="Рекомендуется экспорт"
                  description={`Накоплено ${data.unreviewed_logs_count} неразмеченных/ожидающих записей (порог: ${data.export_threshold}). Пожалуйста, выполните экспорт для передачи ML-специалисту.`}
                />
              ) : data.reviewed_logs_count > 0 ? (
                <Alert
                  type="success"
                  showIcon
                  message="Данные готовы к экспорту"
                  description={`Сформирован пул из ${data.reviewed_logs_count} проверенных записей для последующего дообучения ML-специалистом.`}
                />
              ) : (
                <Alert
                  type="info"
                  showIcon
                  message="Требуется разметка"
                  description="В журнале событий пока нет проверенных записей для экспорта."
                />
              )}
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={exporting}
                disabled={data.reviewed_logs_count === 0}
                block
                size="large"
                onClick={handleExportCSV}
                style={{
                  height: '45px',
                  fontWeight: 600,
                  boxShadow: '0 4px 10px rgba(79, 70, 229, 0.15)',
                  backgroundColor: '#4f46e5'
                }}
              >
                {exporting ? 'Экспорт...' : 'Экспортировать размеченные данные'}
              </Button>
            </div>
          </Card>

          <Card
            title={
              <Space>
                <SlidersOutlined style={{ color: '#4f46e5' }} />
                <span>Оптимизация каскадной модерации</span>
              </Space>
            }
            bordered={false}
            className="premium-card"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Paragraph style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>
                Порог <strong>CASCADE_THRESHOLD</strong> определяет уровень неопределенности базового классификатора, при превышении которого запрос перенаправляется в нейросеть ruBERT.
              </Paragraph>

              <div style={{ border: '1px solid #f1f5f9', padding: '14px', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>Порог переключения:</Text>
                  <Text strong style={{ color: '#4f46e5', fontSize: '15px' }}>{cascadeThreshold.toFixed(2)}</Text>
                </div>
                <Slider
                  min={0.01}
                  max={0.99}
                  step={0.01}
                  value={cascadeThreshold}
                  onChange={(val) => setCascadeThreshold(val)}
                  onAfterChange={handleThresholdChange}
                  disabled={updatingThreshold}
                  trackStyle={{ backgroundColor: '#4f46e5' }}
                  handleStyle={{ borderColor: '#4f46e5', backgroundColor: '#ffffff' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  <span>Экономия ресурсов</span>
                  <span>Макс. безопасность</span>
                </div>
              </div>

              <Divider style={{ margin: '12px 0' }} />
              
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>Поклассовые пороги эскалации:</Text>
              <Paragraph style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                Калибруемые пороги для отдельных категорий. Низкие пороги (0.01–0.10) для критических рисков обеспечивают частую эскалацию (снижение FN). Высокие пороги (0.40) для менее критичных рисков расширяют fast-path (снижение latency).
              </Paragraph>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {Object.entries(perClassThresholds).map(([cls, val]) => (
                  <div key={cls} style={{ border: '1px solid #f1f5f9', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                      <Text strong style={{ fontSize: '11px' }}>{cls}</Text>
                      <Text strong style={{ color: '#4f46e5', fontSize: '12px' }}>{val.toFixed(3)}</Text>
                    </div>
                    <Slider
                      min={0.001}
                      max={0.999}
                      step={0.001}
                      value={val}
                      onChange={(newVal) => setPerClassThresholds(prev => ({ ...prev, [cls]: newVal }))}
                      trackStyle={{ backgroundColor: '#4f46e5' }}
                      handleStyle={{ borderColor: '#4f46e5', backgroundColor: '#ffffff' }}
                    />
                  </div>
                ))}
              </div>
              
              <Button
                type="primary"
                onClick={handleSavePerClassThresholds}
                loading={savingPerClass}
                style={{ marginTop: '12px', backgroundColor: '#4f46e5' }}
                block
              >
                Сохранить поклассовые пороги
              </Button>
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
                <span>История качества по эпохам активного обучения</span>
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
                    name="Accuracy"
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <Line
                    name="F₁-Score"
                    type="monotone"
                    dataKey="f1_score"
                    stroke="#ec4899"
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
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
