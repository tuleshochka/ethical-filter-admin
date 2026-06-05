import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Tag, Space, Typography, Button, Drawer, 
  Radio, Input, Select, Row, Col, Alert, message, Divider, Tooltip 
} from 'antd';
import { 
  AuditOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { RequestLogEntry } from '../types.ts';
import { STRATEGY_COLORS, STRATEGY_DESCRIPTIONS, API_BASE } from '../types.ts';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [strategyFilter, setStrategyFilter] = useState<string | null>(null);
  const [piiFilter, setPiiFilter] = useState<boolean | null>(null);
  const [reviewedFilter, setReviewedFilter] = useState<boolean | null>(null);
  const [auditPriorityFilter, setAuditPriorityFilter] = useState<boolean | null>(null);
  const [classificationLevelFilter, setClassificationLevelFilter] = useState<number | null>(null);

  // Drawer review state
  const [selectedLog, setSelectedLog] = useState<RequestLogEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reviewCorrect, setReviewCorrect] = useState(true);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [page, size, strategyFilter, piiFilter, reviewedFilter, auditPriorityFilter, classificationLevelFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE}/logs?page=${page}&size=${size}`;
      if (strategyFilter) url += `&strategy=${strategyFilter}`;
      if (piiFilter !== null) url += `&pii_detected=${piiFilter}`;
      if (reviewedFilter !== null) url += `&reviewed=${reviewedFilter}`;
      if (auditPriorityFilter !== null) url += `&audit_priority=${auditPriorityFilter}`;
      if (classificationLevelFilter !== null) url += `&classification_level=${classificationLevelFilter}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Не удалось получить журнал логов запросов');
      
      const data = await response.json();
      setLogs(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = (record: RequestLogEntry) => {
    setSelectedLog(record);
    setReviewCorrect(record.review_correct !== null ? record.review_correct : true);
    setReviewNote(record.review_note || '');
    setDrawerOpen(true);
  };

  const handleSaveReview = async () => {
    if (!selectedLog) return;
    setReviewSaving(true);
    try {
      const response = await fetch(`${API_BASE}/logs/${selectedLog.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correct: reviewCorrect,
          note: reviewNote
        })
      });
      if (!response.ok) throw new Error('Ошибка при сохранении вердикта');
      
      message.success('Результат аудита успешно сохранен!');
      setDrawerOpen(false);
      
      // Update log entry locally
      setLogs(prev => prev.map(item => 
        item.id === selectedLog.id 
          ? { ...item, reviewed: true, review_correct: reviewCorrect, review_note: reviewNote } 
          : item
      ));
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setReviewSaving(false);
    }
  };

  const handleResetFilters = () => {
    setStrategyFilter(null);
    setPiiFilter(null);
    setReviewedFilter(null);
    setAuditPriorityFilter(null);
    setClassificationLevelFilter(null);
    setPage(1);
  };

  const columns: ColumnsType<RequestLogEntry> = [
    {
      title: 'Время',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: '15%',
      render: (text: string) => new Date(text).toLocaleString('ru-RU')
    },
    {
      title: 'Хеш текста',
      dataIndex: 'request_text_hash',
      key: 'hash',
      width: '10%',
      render: (text: string) => <Text code style={{ fontSize: '12px' }}>{text.substring(0, 8)}...</Text>
    },
    {
      title: 'Маскированный запрос',
      dataIndex: 'request_preview',
      key: 'preview',
      width: '30%',
      render: (text: string) => <span style={{ color: '#475569', fontSize: '13px' }}>{text || '—'}</span>
    },
    {
      title: 'Макс. риск',
      dataIndex: 'max_risk_score',
      key: 'max_risk',
      width: '10%',
      render: (score: number) => {
        const percent = (score * 100).toFixed(0);
        let color: string = 'green';
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
      render: (strategy: string) => (
        <Tooltip title={STRATEGY_DESCRIPTIONS[strategy]}>
          <Tag color={STRATEGY_COLORS[strategy] || 'default'} style={{ cursor: 'help' }}>{strategy}</Tag>
        </Tooltip>
      )
    },
    {
      title: 'PII',
      dataIndex: 'pii_detected',
      key: 'pii',
      width: '5%',
      render: (pii: boolean) => pii ? <Tag color="error">Да</Tag> : <Tag color="default">Нет</Tag>
    },
    {
      title: 'Задержка',
      dataIndex: 'latency_ms',
      key: 'latency',
      width: '8%',
      render: (lat: number) => <Space size={2}><ClockCircleOutlined style={{ color: '#94a3b8' }} /><Text>{lat} мс</Text></Space>
    },
    {
      title: 'Уровень каскада',
      dataIndex: 'classification_level',
      key: 'classification_level',
      width: '12%',
      render: (level: number) => {
        if (level === 2) return <Tag color="geekblue">ruBERT</Tag>;
        return <Tag color="orange">baseline</Tag>;
      }
    },
    {
      title: 'Вердикт',
      dataIndex: 'reviewed',
      key: 'reviewed',
      width: '12%',
      render: (reviewed: boolean, record: RequestLogEntry) => (
        <Space>
          {record.audit_priority && (
            <Tooltip title="Пограничное значение Uncertainty-based sampling — требует приоритетного внимания ИБ-аналитика">
              <Tag color="magenta" style={{ fontWeight: 'bold', margin: 0 }}>⚡ Приоритет</Tag>
            </Tooltip>
          )}
          {!reviewed ? (
            <Tag color="warning" style={{ margin: 0 }}>Ожидает</Tag>
          ) : record.review_correct ? (
            <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>Верно</Tag>
          ) : (
            <Tag color="error" icon={<CloseCircleOutlined />} style={{ margin: 0 }}>Ошибка</Tag>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>Журнал событий и Аудит</Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Просмотр истории запросов, маскированных персональных данных и результатов фильтрации. Разметка решений классификатора для активного дообучения модели.
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
                { value: null as unknown as string, label: 'Все' },
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
                { value: null as unknown as boolean, label: 'Все' },
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
                { value: null as unknown as boolean, label: 'Все' },
                { value: true, label: 'Проверен' },
                { value: false, label: 'Ожидает' },
              ]}
              style={{ width: '120px' }}
              size="small"
            />
          </Space>

          <Space size={6}>
            <Text type="secondary" style={{ fontSize: '13px' }}>Приоритет:</Text>
            <Select
              placeholder="Все"
              value={auditPriorityFilter}
              onChange={(val) => { setAuditPriorityFilter(val); setPage(1); }}
              options={[
                { value: null as unknown as boolean, label: 'Все' },
                { value: true, label: 'Только приоритетные' },
                { value: false, label: 'Обычные' },
              ]}
              style={{ width: '160px' }}
              size="small"
            />
          </Space>

          <Space size={6}>
            <Text type="secondary" style={{ fontSize: '13px' }}>Каскад:</Text>
            <Select
              placeholder="Все"
              value={classificationLevelFilter}
              onChange={(val) => { setClassificationLevelFilter(val); setPage(1); }}
              options={[
                { value: null as unknown as number, label: 'Все' },
                { value: 1, label: 'Базовый (baseline)' },
                { value: 2, label: 'Нейросетевой (ruBERT)' },
              ]}
              style={{ width: '150px' }}
              size="small"
            />
          </Space>

          <Button size="small" onClick={handleResetFilters}>Сбросить фильтры</Button>
        </Space>
      </Card>

      {/* Main Table */}
      <Card bordered={false} styles={{ body: { padding: 0 } }} style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        {error && <Alert message="Ошибка загрузки журнала" description={error} type="error" showIcon style={{ margin: '16px' }} />}
        
        <Table<RequestLogEntry>
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => handleOpenDrawer(record),
            style: { 
              cursor: 'pointer',
              backgroundColor: record.audit_priority && !record.reviewed ? '#fff0f6' : undefined
            }
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
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        styles={{ body: { padding: '24px' } }}
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

            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>ДОМЕН</Text>
                <Text strong>{selectedLog.domain || '—'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>КАНАЛ</Text>
                <Text strong>{selectedLog.channel || '—'}</Text>
              </Col>
            </Row>

            {selectedLog.history_json && Array.isArray(selectedLog.history_json) && selectedLog.history_json.length > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase', marginBottom: '8px' }}>ИСТОРИЯ ДИАЛОГА</Text>
                <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {selectedLog.history_json.map((msg: any, i: number) => (
                    <div key={i} style={{ marginBottom: '8px', fontSize: '12px' }}>
                      <Text type="secondary" strong>{msg.role === 'user' ? 'Пользователь: ' : 'Ассистент: '}</Text>
                      <Paragraph style={{ margin: 0, paddingLeft: '8px', borderLeft: '2px solid #cbd5e1' }}>
                        {msg.content}
                      </Paragraph>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>МАСКИРОВАННЫЙ ТЕКСТ</Text>
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
                <Tooltip title={STRATEGY_DESCRIPTIONS[selectedLog.selected_strategy]}>
                  <Tag color={STRATEGY_COLORS[selectedLog.selected_strategy] || 'default'} style={{ marginTop: '4px', cursor: 'help' }}>
                    {selectedLog.selected_strategy}
                  </Tag>
                </Tooltip>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>ДЕТЕКТИРОВАН PII</Text>
                <Tag color={selectedLog.pii_detected ? 'error' : 'default'} style={{ marginTop: '4px' }}>
                  {selectedLog.pii_detected ? 'Обнаружен' : 'Нет'}
                </Tag>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0' }}>Вердикт</Divider>

            {/* Audit Form */}
            <div>
              <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>Вердикт классификации:</Text>
                <Radio.Group 
                  value={reviewCorrect} 
                  onChange={(e) => setReviewCorrect(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value={true} style={{ width: '230px', textAlign: 'center' }}>
                    <CheckCircleOutlined /> Верно — фильтр сработал корректно
                  </Radio.Button>
                  <Radio.Button value={false} style={{ width: '230px', textAlign: 'center' }}>
                    <CloseCircleOutlined /> Ошибка — ложное срабатывание или пропуск
                  </Radio.Button>
                </Radio.Group>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>Примечание аудитора:</Text>
                <TextArea
                  rows={4}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Опишите дефекты классификации, например ложное срабатывание на PII или пропуск токсичности..."
                />
              </div>

              <Button 
                type="primary" 
                onClick={handleSaveReview}
                loading={reviewSaving}
                icon={<AuditOutlined />}
                style={{ width: '100%', backgroundColor: '#4f46e5' }}
              >
                Сохранить вердикт
              </Button>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default Logs;
