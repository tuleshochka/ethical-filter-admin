import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Tag, Space, Typography, Button, Drawer, 
  Radio, Input, Form, Select, DatePicker, Row, Col, Alert, message, Divider 
} from 'antd';
import { 
  HistoryOutlined, 
  SearchOutlined, 
  AuditOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  EyeInvisibleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const STRATEGY_COLORS = {
  ALLOW: 'success',
  SOFTEN: 'processing',
  CAUTION: 'warning',
  CLARIFY: 'warning',
  REDIRECT: 'purple',
  REFUSE: 'error',
};

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [strategyFilter, setStrategyFilter] = useState(null);
  const [piiFilter, setPiiFilter] = useState(null);
  const [reviewedFilter, setReviewedFilter] = useState(null);

  // Drawer review state
  const [selectedLog, setSelectedLog] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [reviewCorrect, setReviewCorrect] = useState(true);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [page, size, strategyFilter, piiFilter, reviewedFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:8000/api/v1/logs?page=${page}&size=${size}`;
      if (strategyFilter) url += `&strategy=${strategyFilter}`;
      if (piiFilter !== null) url += `&pii_detected=${piiFilter}`;
      if (reviewedFilter !== null) url += `&reviewed=${reviewedFilter}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Не удалось получить журнал логов запросов');
      
      const data = await response.json();
      setLogs(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = (record) => {
    setSelectedLog(record);
    setReviewCorrect(record.review_correct !== null ? record.review_correct : true);
    setReviewNote(record.review_note || '');
    setDrawerVisible(true);
  };

  const handleSaveReview = async () => {
    if (!selectedLog) return;
    setReviewSaving(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/logs/${selectedLog.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correct: reviewCorrect,
          note: reviewNote
        })
      });
      if (!response.ok) throw new Error('Ошибка при сохранении вердикта');
      
      message.success('Результат аудита успешно сохранен!');
      setDrawerVisible(false);
      
      // Update log entry locally
      setLogs(prev => prev.map(item => 
        item.id === selectedLog.id 
          ? { ...item, reviewed: true, review_correct: reviewCorrect, review_note: reviewNote } 
          : item
      ));
    } catch (err) {
      message.error(err.message);
    } finally {
      setReviewSaving(false);
    }
  };

  const handleResetFilters = () => {
    setStrategyFilter(null);
    setPiiFilter(null);
    setReviewedFilter(null);
    setPage(1);
  };

  const columns = [
    {
      title: 'Время',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: '15%',
      render: (text) => new Date(text).toLocaleString('ru-RU')
    },
    {
      title: 'Хеш текста',
      dataIndex: 'request_text_hash',
      key: 'hash',
      width: '10%',
      render: (text) => <Text code style={{ fontSize: '12px' }}>{text.substring(0, 8)}...</Text>
    },
    {
      title: 'Маскированный запрос (Preview)',
      dataIndex: 'request_preview',
      key: 'preview',
      width: '30%',
      render: (text) => <span style={{ color: '#475569', fontSize: '13px' }}>{text || '—'}</span>
    },
    {
      title: 'Макс. риск',
      dataIndex: 'max_risk_score',
      key: 'max_risk',
      width: '10%',
      render: (score) => {
        const percent = (score * 100).toFixed(0);
        let color = 'green';
        if (score >= 0.6) color = 'red';
        else if (score >= 0.3) color = 'orange';
        return <Tag color={color}>{percent}%</Tag>;
      }
    },
    {
      title: 'Стратегия',
      dataIndex: 'selected_strategy',
      key: 'strategy',
      width: '10%',
      render: (strategy) => <Tag color={STRATEGY_COLORS[strategy] || 'default'}>{strategy}</Tag>
    },
    {
      title: 'PII',
      dataIndex: 'pii_detected',
      key: 'pii',
      width: '5%',
      render: (pii) => pii ? <Tag color="error">Да</Tag> : <Tag color="default">Нет</Tag>
    },
    {
      title: 'Задержка',
      dataIndex: 'latency_ms',
      key: 'latency',
      width: '8%',
      render: (lat) => <Space size={2}><ClockCircleOutlined style={{ color: '#94a3b8' }} /><Text>{lat} мс</Text></Space>
    },
    {
      title: 'Аудит',
      dataIndex: 'reviewed',
      key: 'reviewed',
      width: '12%',
      render: (reviewed, record) => {
        if (!reviewed) return <Tag color="warning">Ожидает</Tag>;
        return record.review_correct ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>Верно</Tag>
        ) : (
          <Tag color="error" icon={<CloseCircleOutlined />}>Ошибка</Tag>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>Журнал событий и Аудит</Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Просмотр истории запросов, маскированных персональных данных и результатов фильтрации. Разметка решений классификатора для активного дообучения модели (Active Learning).
        </Paragraph>
      </div>

      {/* Filter Bar */}
      <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <Space wrap size={16}>
          <Text strong style={{ marginRight: '8px' }}>Фильтры:</Text>
          
          <Space size={6}>
            <Text type="secondary" style={{ fontSize: '13px' }}>Стратегия:</Text>
            <Select
              placeholder="Все"
              value={strategyFilter}
              onChange={(val) => { setStrategyFilter(val); setPage(1); }}
              options={[
                { value: null, label: 'Все' },
                { value: 'ALLOW', label: 'ALLOW' },
                { value: 'SOFTEN', label: 'SOFTEN' },
                { value: 'CAUTION', label: 'CAUTION' },
                { value: 'CLARIFY', label: 'CLARIFY' },
                { value: 'REDIRECT', label: 'REDIRECT' },
                { value: 'REFUSE', label: 'REFUSE' },
              ]}
              style={{ width: '120px' }}
              size="small"
            />
          </Space>

          <Space size={6}>
            <Text type="secondary" style={{ fontSize: '13px' }}>PII:</Text>
            <Select
              placeholder="Все"
              value={piiFilter}
              onChange={(val) => { setPiiFilter(val); setPage(1); }}
              options={[
                { value: null, label: 'Все' },
                { value: true, label: 'С PII' },
                { value: false, label: 'Без PII' },
              ]}
              style={{ width: '100px' }}
              size="small"
            />
          </Space>

          <Space size={6}>
            <Text type="secondary" style={{ fontSize: '13px' }}>Статус аудита:</Text>
            <Select
              placeholder="Все"
              value={reviewedFilter}
              onChange={(val) => { setReviewedFilter(val); setPage(1); }}
              options={[
                { value: null, label: 'Все' },
                { value: true, label: 'Проверен' },
                { value: false, label: 'Ожидает' },
              ]}
              style={{ width: '120px' }}
              size="small"
            />
          </Space>

          <Button size="small" onClick={handleResetFilters}>Сбросить фильтры</Button>
        </Space>
      </Card>

      {/* Main Table */}
      <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        {error && <Alert message="Ошибка загрузки журнала" description={error} type="error" showIcon style={{ margin: '16px' }} />}
        
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => handleOpenDrawer(record),
            style: { cursor: 'pointer' }
          })}
          pagination={{
            current: page,
            pageSize: size,
            total: total,
            onChange: (p, s) => { setPage(p); setSize(s); },
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50']
          }}
          bordered={false}
        />
      </Card>

      {/* Details Drawer with Review Form */}
      <Drawer
        title={
          <Space>
            <AuditOutlined style={{ color: '#4f46e5' }} />
            <span>Детали запроса и Аудит</span>
          </Space>
        }
        placement="right"
        width={550}
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        bodyStyle={{ padding: '24px' }}
      >
        {selectedLog && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Log Attributes */}
            <div>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>ХЕШ ЗАПРОСА</Text>
              <Text strong>{selectedLog.request_text_hash}</Text>
            </div>
            
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>ВРЕМЯ ЗАПРОСА</Text>
                <Text strong>{new Date(selectedLog.timestamp).toLocaleString('ru-RU')}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>ЗАДЕРЖКА</Text>
                <Text strong>{selectedLog.latency_ms} мс</Text>
              </Col>
            </Row>

            <div>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>МАКИРОВАННЫЙ ТЕКСТ</Text>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#1e293b', fontSize: '13px' }}>
                {selectedLog.request_preview || '—'}
              </div>
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase', marginBottom: '8px' }}>ОЦЕНКИ КЛАССИФИКАТОРА</Text>
              <Row gutter={[16, 8]}>
                {Object.entries(selectedLog.detected_categories).map(([cat, score]) => (
                  <Col span={12} key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <Text style={{ fontSize: '11px' }}>{cat}</Text>
                      <Text strong style={{ fontSize: '11px' }}>{(score * 100).toFixed(0)}%</Text>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>ПРИМЕНЕННАЯ СТРАТЕГИЯ</Text>
                <Tag color={STRATEGY_COLORS[selectedLog.selected_strategy] || 'default'} style={{ marginTop: '4px' }}>
                  {selectedLog.selected_strategy}
                </Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>ДЕТЕКТИРОВАН PII</Text>
                <Tag color={selectedLog.pii_detected ? 'error' : 'default'} style={{ marginTop: '4px' }}>
                  {selectedLog.pii_detected ? 'Обнаружен' : 'Нет'}
                </Tag>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0' }}>Результат проверки (Аудит)</Divider>

            {/* Audit Form */}
            <Form layout="vertical" onFinish={handleSaveReview}>
              <Form.Item label={<Text strong>Вердикт классификации:</Text>}>
                <Radio.Group 
                  value={reviewCorrect} 
                  onChange={(e) => setReviewCorrect(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value={true} style={{ width: '230px', textAlign: 'center' }}>
                    <CheckCircleOutlined /> Верно (Фильтр сработал верно)
                  </Radio.Button>
                  <Radio.Button value={false} style={{ width: '230px', textAlign: 'center' }} danger>
                    <CloseCircleOutlined /> Ошибка (Ложное / Пропуск)
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item label={<Text strong>Примечание аудитора:</Text>}>
                <TextArea
                  rows={4}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Опишите дефекты классификации (например, ложное срабатывание на PII или пропуск токсичности)..."
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  onClick={handleSaveReview}
                  loading={reviewSaving}
                  icon={<AuditOutlined />}
                  style={{ width: '100%', backgroundColor: '#4f46e5' }}
                >
                  Сохранить вердикт
                </Button>
              </Form.Item>
            </Form>
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default Logs;
