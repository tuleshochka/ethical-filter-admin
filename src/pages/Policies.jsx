import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Select, Button, Slider, Space, Typography, 
  Spin, Alert, Switch, Tabs, Form, Input, Row, Col, Divider, message 
} from 'antd';
import { 
  SafetyCertificateOutlined, 
  SettingOutlined, 
  BookOutlined,
  SaveOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

const STRATEGY_OPTIONS = [
  { value: 'ALLOW', label: 'ALLOW (Разрешить)' },
  { value: 'SOFTEN', label: 'SOFTEN (Смягчить тон)' },
  { value: 'CAUTION', label: 'CAUTION (Предупреждение)' },
  { value: 'CLARIFY', label: 'CLARIFY (Уточнить намерение)' },
  { value: 'REDIRECT', label: 'REDIRECT (Перенаправить)' },
  { value: 'REFUSE', label: 'REFUSE (Вежливый отказ)' },
];

const Policies = ({ onPolicyChanged }) => {
  const [policies, setPolicies] = useState([]);
  const [activePolicyId, setActivePolicyId] = useState(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingThreshold, setEditingThreshold] = useState(null); // threshold ID being edited

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch policies
      const policiesRes = await fetch('http://localhost:8000/api/v1/policies');
      const policiesData = await policiesRes.json();
      setPolicies(policiesData);
      
      const active = policiesData.find(p => p.is_active);
      if (active) {
        setActivePolicyId(active.id);
        setSelectedPolicyId(active.id);
      } else if (policiesData.length > 0) {
        setSelectedPolicyId(policiesData[0].id);
      }

      // Fetch categories
      const categoriesRes = await fetch('http://localhost:8000/api/v1/categories');
      const categoriesData = await categoriesRes.json();
      setCategories(categoriesData.sort((a, b) => b.priority - a.priority));

      // Fetch strategy templates
      const strategiesRes = await fetch('http://localhost:8000/api/v1/strategies');
      const strategiesData = await strategiesRes.json();
      setStrategies(strategiesData);

    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить параметры политик безопасности с сервера.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePolicy = async (policyId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/policies/${policyId}/activate`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Ошибка активации политики');
      
      message.success('Политика безопасности успешно активирована!');
      
      // Update local policies state
      const updatedPolicies = policies.map(p => ({
        ...p,
        is_active: p.id === policyId
      }));
      setPolicies(updatedPolicies);
      setActivePolicyId(policyId);
      
      // Trigger update of sidebar
      if (onPolicyChanged) {
        onPolicyChanged(updatedPolicies.find(p => p.id === policyId));
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleToggleCategory = async (catId, checked) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/categories/${catId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: checked })
      });
      if (!response.ok) throw new Error('Ошибка изменения статуса категории');
      
      message.success('Статус категории риска обновлен');
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, is_active: checked } : c));
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleSaveThreshold = async (thresholdId, thresholdData) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/policies/${selectedPolicyId}/thresholds/${thresholdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thresholdData)
      });
      if (!response.ok) throw new Error('Ошибка сохранения порогов');
      
      message.success('Пороговые значения и стратегии сохранены');
      setEditingThreshold(null);
      
      // Refresh policies data to reflect thresholds change
      const policiesRes = await fetch('http://localhost:8000/api/v1/policies');
      const policiesData = await policiesRes.json();
      setPolicies(policiesData);
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleSaveStrategyTemplate = async (strategyId, values) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/strategies/${strategyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      if (!response.ok) throw new Error('Ошибка сохранения шаблона стратегии');
      
      message.success('Системные инструкции стратегии успешно сохранены');
      setStrategies(prev => prev.map(s => s.id === strategyId ? { ...s, ...values } : s));
    } catch (err) {
      message.error(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" tip="Загрузка настроек политик безопасности..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert message="Ошибка загрузки настроек" description={error} type="error" showIcon />
      </div>
    );
  }

  const selectedPolicy = policies.find(p => p.id === selectedPolicyId);
  const thresholds = selectedPolicy ? selectedPolicy.thresholds : [];
  
  // Map category code to name for display in table
  const catMap = categories.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  const columns = [
    {
      title: 'Категория риска',
      dataIndex: 'category_id',
      key: 'category',
      width: '20%',
      render: (catId) => {
        const cat = catMap[catId];
        if (!cat) return 'Неизвестно';
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ color: cat.is_active ? '#1e293b' : '#94a3b8' }}>
              {cat.name}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>{cat.code}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Порог Low (Слабый риск)',
      dataIndex: 'id',
      key: 'low',
      width: '25%',
      render: (_, record) => {
        const isEditing = editingThreshold === record.id;
        const currentVal = isEditing ? record._temp_threshold_low ?? record.threshold_low : record.threshold_low;
        const currentStrat = isEditing ? record._temp_strategy_low ?? record.strategy_low : record.strategy_low;
        
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Text style={{ fontSize: '12px' }}>Порог: {currentVal.toFixed(2)}</Text>
              {isEditing ? (
                <Select
                  size="small"
                  value={currentStrat}
                  onChange={(val) => {
                    record._temp_strategy_low = val;
                    setEditingThreshold(record.id); // Force re-render
                  }}
                  options={STRATEGY_OPTIONS}
                  style={{ width: '130px' }}
                />
              ) : (
                <Tag color="blue">{record.strategy_low}</Tag>
              )}
            </div>
            {isEditing && (
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={currentVal}
                onChange={(val) => {
                  record._temp_threshold_low = val;
                  setEditingThreshold(record.id);
                }}
                style={{ margin: '8px 0 0 0' }}
              />
            )}
          </Space>
        );
      }
    },
    {
      title: 'Порог Medium (Средний риск)',
      dataIndex: 'id',
      key: 'medium',
      width: '25%',
      render: (_, record) => {
        const isEditing = editingThreshold === record.id;
        const currentVal = isEditing ? record._temp_threshold_medium ?? record.threshold_medium : record.threshold_medium;
        const currentStrat = isEditing ? record._temp_strategy_medium ?? record.strategy_medium : record.strategy_medium;
        
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Text style={{ fontSize: '12px' }}>Порог: {currentVal.toFixed(2)}</Text>
              {isEditing ? (
                <Select
                  size="small"
                  value={currentStrat}
                  onChange={(val) => {
                    record._temp_strategy_medium = val;
                    setEditingThreshold(record.id);
                  }}
                  options={STRATEGY_OPTIONS}
                  style={{ width: '130px' }}
                />
              ) : (
                <Tag color="orange">{record.strategy_medium}</Tag>
              )}
            </div>
            {isEditing && (
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={currentVal}
                onChange={(val) => {
                  record._temp_threshold_medium = val;
                  setEditingThreshold(record.id);
                }}
                style={{ margin: '8px 0 0 0' }}
              />
            )}
          </Space>
        );
      }
    },
    {
      title: 'Порог High (Высокий риск)',
      dataIndex: 'id',
      key: 'high',
      width: '25%',
      render: (_, record) => {
        const isEditing = editingThreshold === record.id;
        const currentVal = isEditing ? record._temp_threshold_high ?? record.threshold_high : record.threshold_high;
        const currentStrat = isEditing ? record._temp_strategy_high ?? record.strategy_high : record.strategy_high;
        
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Text style={{ fontSize: '12px' }}>Порог: {currentVal.toFixed(2)}</Text>
              {isEditing ? (
                <Select
                  size="small"
                  value={currentStrat}
                  onChange={(val) => {
                    record._temp_strategy_high = val;
                    setEditingThreshold(record.id);
                  }}
                  options={STRATEGY_OPTIONS}
                  style={{ width: '130px' }}
                />
              ) : (
                <Tag color="red">{record.strategy_high}</Tag>
              )}
            </div>
            {isEditing && (
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={currentVal}
                onChange={(val) => {
                  record._temp_threshold_high = val;
                  setEditingThreshold(record.id);
                }}
                style={{ margin: '8px 0 0 0' }}
              />
            )}
          </Space>
        );
      }
    },
    {
      title: 'Действие',
      key: 'action',
      width: '5%',
      render: (_, record) => {
        const isEditing = editingThreshold === record.id;
        if (isEditing) {
          return (
            <Space>
              <Button 
                type="primary" 
                size="small"
                icon={<SaveOutlined />}
                onClick={() => {
                  const data = {
                    threshold_low: record._temp_threshold_low ?? record.threshold_low,
                    threshold_medium: record._temp_threshold_medium ?? record.threshold_medium,
                    threshold_high: record._temp_threshold_high ?? record.threshold_high,
                    strategy_low: record._temp_strategy_low ?? record.strategy_low,
                    strategy_medium: record._temp_strategy_medium ?? record.strategy_medium,
                    strategy_high: record._temp_strategy_high ?? record.strategy_high,
                  };
                  handleSaveThreshold(record.id, data);
                }}
                style={{ backgroundColor: '#10b981' }}
              >
                ОК
              </Button>
              <Button 
                size="small"
                onClick={() => {
                  // Cancel
                  delete record._temp_threshold_low;
                  delete record._temp_threshold_medium;
                  delete record._temp_threshold_high;
                  delete record._temp_strategy_low;
                  delete record._temp_strategy_medium;
                  delete record._temp_strategy_high;
                  setEditingThreshold(null);
                }}
              >
                Отмена
              </Button>
            </Space>
          );
        }
        return (
          <Button 
            size="small" 
            icon={<SettingOutlined />}
            onClick={() => {
              setEditingThreshold(record.id);
            }}
          >
            Изменить
          </Button>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>Управление политиками</Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Активация политик безопасности, регулирование порогов чувствительности по категориям и настройка системных промптов стратегий адаптации ответов.
        </Paragraph>
      </div>

      <Tabs defaultActiveKey="thresholds_tab" style={{ marginBottom: '24px' }}>
        {/* TAB 1: Thresholds Configuration */}
        <TabPane 
          tab={
            <span>
              <SafetyCertificateOutlined />
              Пороги безопасности
            </span>
          } 
          key="thresholds_tab"
        >
          <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
            <Col xs={24} md={12}>
              <Card size="small" style={{ backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <Space>
                  <Text strong>Редактируемая политика:</Text>
                  <Select
                    value={selectedPolicyId}
                    onChange={(val) => {
                      setSelectedPolicyId(val);
                      setEditingThreshold(null);
                    }}
                    options={policies.map(p => ({ value: p.id, label: p.name }))}
                    style={{ width: '180px' }}
                  />
                  {selectedPolicyId !== activePolicyId && (
                    <Button 
                      type="dashed"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleActivatePolicy(selectedPolicyId)}
                    >
                      Сделать активной
                    </Button>
                  )}
                </Space>
              </Card>
            </Col>
            
            {/* Category Activation list */}
            <Col xs={24} md={12}>
              <Card size="small" style={{ backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <Space wrap size={16}>
                  <Text strong>Активные категории:</Text>
                  {categories.map(cat => (
                    <Space key={cat.id} size={4}>
                      <Switch 
                        size="small" 
                        checked={cat.is_active} 
                        onChange={(checked) => handleToggleCategory(cat.id, checked)}
                      />
                      <Text style={{ fontSize: '12px', color: cat.is_active ? '#0f172a' : '#94a3b8' }}>{cat.code}</Text>
                    </Space>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>

          <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <Table
              dataSource={thresholds}
              columns={columns}
              rowKey="id"
              pagination={false}
              bordered={false}
            />
          </Card>
        </TabPane>

        {/* TAB 2: Strategy Prompt Templates */}
        <TabPane 
          tab={
            <span>
              <BookOutlined />
              Шаблоны системных промптов (Стратегии)
            </span>
          } 
          key="strategies_tab"
        >
          <Card bordered={false} style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <Tabs tabPosition="left">
              {strategies.map((strat) => (
                <TabPane tab={strat.strategy_code} key={strat.strategy_code}>
                  <div style={{ padding: '0 16px' }}>
                    <Title level={4}>Настройка стратегии {strat.strategy_code}</Title>
                    <Paragraph type="secondary">
                      Эти инструкции добавляются в системный промпт LLM при срабатывании данной стратегии фильтрации.
                    </Paragraph>
                    <Divider style={{ margin: '16px 0' }} />
                    
                    <Form
                      layout="vertical"
                      initialValues={{
                        system_prompt: strat.system_prompt,
                        user_message: strat.user_message
                      }}
                      onFinish={(values) => handleSaveStrategyTemplate(strat.id, values)}
                    >
                      <Form.Item
                        label={<Text strong>Системный промпт (инструкции LLM)</Text>}
                        name="system_prompt"
                        help="Добавляется в начало системного сообщения LLM (system prompt)."
                      >
                        <Input.TextArea rows={4} placeholder="Введите системные инструкции для LLM..." style={{ fontFamily: 'monospace' }} />
                      </Form.Item>

                      <Form.Item
                        label={<Text strong>Статическое сообщение (Bypass LLM)</Text>}
                        name="user_message"
                        help="Если это поле заполнено, система сразу вернет данный текст пользователю без вызова LLM. Полезно для мгновенного отказа (REFUSE)."
                      >
                        <Input.TextArea rows={3} placeholder="Введите фиксированное сообщение для пользователя (опционально)..." />
                      </Form.Item>

                      <Form.Item>
                        <Button 
                          type="primary" 
                          htmlType="submit" 
                          icon={<SaveOutlined />}
                          style={{ backgroundColor: '#4f46e5' }}
                        >
                          Сохранить шаблон
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                </TabPane>
              ))}
            </Tabs>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Policies;
