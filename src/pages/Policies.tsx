import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Tabs, Table, Tag, Space, Button, Select,
  Slider, InputNumber, Spin, Alert, Switch, message, Input, Divider, Empty, Tooltip
} from 'antd';
import { 
  EditOutlined, 
  SaveOutlined, 
  CloseOutlined,
  RocketOutlined,
  CopyOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Policy, PolicyThreshold, RiskCategory, StrategyTemplate } from '../types.ts';
import { STRATEGY_OPTIONS, STRATEGY_COLORS, STRATEGY_DESCRIPTIONS, API_BASE } from '../types.ts';

const { Title, Paragraph, Text } = Typography;
const { TextArea: AntTextArea } = Input;

interface PoliciesProps {
  onPolicyChanged: (policy: Policy) => void;
}

const Policies: React.FC<PoliciesProps> = ({ onPolicyChanged }) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [categories, setCategories] = useState<RiskCategory[]>([]);
  const [strategies, setStrategies] = useState<StrategyTemplate[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingThresholdId, setEditingThresholdId] = useState<number | null>(null);

  // Editable fields for currently editing threshold
  const [editForm, setEditForm] = useState<{
    threshold_low: number;
    threshold_medium: number;
    threshold_high: number;
    strategy_low: string;
    strategy_medium: string;
    strategy_high: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [policiesRes, categoriesRes, strategiesRes] = await Promise.all([
        fetch(`${API_BASE}/policies`),
        fetch(`${API_BASE}/categories`),
        fetch(`${API_BASE}/strategies`)
      ]);

      if (!policiesRes.ok || !categoriesRes.ok || !strategiesRes.ok) {
        throw new Error('Не удалось загрузить данные с сервера');
      }

      const policiesData: Policy[] = await policiesRes.json();
      const categoriesData: RiskCategory[] = await categoriesRes.json();
      const strategiesData: StrategyTemplate[] = await strategiesRes.json();

      setPolicies(policiesData);
      setCategories(categoriesData);
      setStrategies(strategiesData);

      const active = policiesData.find(p => p.is_active);
      if (active) {
        setSelectedPolicyId(active.id);
      } else if (policiesData.length > 0) {
        setSelectedPolicyId(policiesData[0].id);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const selectedPolicy = policies.find(p => p.id === selectedPolicyId);
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // ─── Handlers ───

  const handleActivatePolicy = async () => {
    if (!selectedPolicyId) return;
    try {
      const response = await fetch(`${API_BASE}/policies/${selectedPolicyId}/activate`, { method: 'POST' });
      if (!response.ok) throw new Error('Ошибка активации политики');
      
      const updated: Policy = await response.json();
      setPolicies(prev => prev.map(p => ({ ...p, is_active: p.id === updated.id })));
      onPolicyChanged(updated);
      message.success(`Политика «${updated.name}» активирована!`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleToggleCategory = async (cat: RiskCategory) => {
    try {
      const response = await fetch(`${API_BASE}/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !cat.is_active })
      });
      if (!response.ok) throw new Error('Ошибка обновления категории');
      
      const updated: RiskCategory = await response.json();
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      message.success(`Категория ${updated.code}: ${updated.is_active ? 'активирована' : 'деактивирована'}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleStartEditThreshold = (threshold: PolicyThreshold) => {
    setEditingThresholdId(threshold.id);
    setEditForm({
      threshold_low: threshold.threshold_low,
      threshold_medium: threshold.threshold_medium,
      threshold_high: threshold.threshold_high,
      strategy_low: threshold.strategy_low,
      strategy_medium: threshold.strategy_medium,
      strategy_high: threshold.strategy_high,
    });
  };

  const handleCancelEditThreshold = () => {
    setEditingThresholdId(null);
    setEditForm(null);
  };

  const handleSaveThreshold = async (policyId: number, thresholdId: number) => {
    if (!editForm) return;
    try {
      const response = await fetch(`${API_BASE}/policies/${policyId}/thresholds/${thresholdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!response.ok) throw new Error('Ошибка обновления порога');
      
      const updatedPolicy: Policy = await response.json();
      setPolicies(prev => prev.map(p => p.id === updatedPolicy.id ? updatedPolicy : p));
      setEditingThresholdId(null);
      setEditForm(null);
      message.success('Пороги успешно обновлены!');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleClonePolicy = async () => {
    if (!selectedPolicyId) return;
    try {
      const response = await fetch(`${API_BASE}/policies/${selectedPolicyId}/clone`, { method: 'POST' });
      if (!response.ok) throw new Error('Ошибка клонирования политики');
      
      const newPolicy: Policy = await response.json();
      setPolicies(prev => [...prev, newPolicy]);
      setSelectedPolicyId(newPolicy.id);
      message.success(`Политика «${newPolicy.name}» успешно клонирована!`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Ошибка при клонировании');
    }
  };

  const handleDeletePolicy = async () => {
    if (!selectedPolicyId) return;
    const policyToDelete = policies.find(p => p.id === selectedPolicyId);
    if (!policyToDelete) return;
    
    if (policyToDelete.is_active) {
      message.error('Нельзя удалить активную политику безопасности!');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/policies/${selectedPolicyId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.detail || 'Ошибка при удалении политики');
      }
      
      setPolicies(prev => prev.filter(p => p.id !== selectedPolicyId));
      message.success(`Политика «${policyToDelete.name}» успешно удалена!`);
      
      // Select another policy
      const remaining = policies.filter(p => p.id !== selectedPolicyId);
      if (remaining.length > 0) {
        setSelectedPolicyId(remaining[0].id);
      } else {
        setSelectedPolicyId(null);
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Не удалось удалить политику');
    }
  };

  const handleUpdateStrategy = async (strategyId: number, field: string, value: string | boolean) => {
    try {
      const response = await fetch(`${API_BASE}/strategies/${strategyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (!response.ok) throw new Error('Ошибка сохранения стратегии');
      
      const updated: StrategyTemplate = await response.json();
      setStrategies(prev => prev.map(s => s.id === updated.id ? updated : s));
      message.success('Шаблон стратегии обновлен!');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  // ─── Table columns ───

  const thresholdColumns: ColumnsType<PolicyThreshold> = [
    {
      title: 'Категория',
      dataIndex: 'category_id',
      key: 'category',
      width: '18%',
      render: (catId: number) => {
        const cat = categoryMap.get(catId);
        if (!cat) return catId;
        return (
          <Space size="small">
            <Switch 
              size="small" 
              checked={cat.is_active} 
              onChange={() => handleToggleCategory(cat)}
            />
            <Text strong style={{ color: cat.is_active ? '#0f172a' : '#94a3b8' }}>
              {cat.code}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Порог: низкий',
      key: 'low',
      width: '12%',
      render: (_: unknown, record: PolicyThreshold) => {
        if (editingThresholdId === record.id && editForm) {
          return (
            <Slider min={0} max={1} step={0.05} value={editForm.threshold_low}
              onChange={(val) => setEditForm(prev => prev ? { ...prev, threshold_low: val } : null)}
            />
          );
        }
        return <Text>{record.threshold_low.toFixed(2)}</Text>;
      }
    },
    {
      title: 'Порог: средний',
      key: 'medium',
      width: '12%',
      render: (_: unknown, record: PolicyThreshold) => {
        if (editingThresholdId === record.id && editForm) {
          return (
            <Slider min={0} max={1} step={0.05} value={editForm.threshold_medium}
              onChange={(val) => setEditForm(prev => prev ? { ...prev, threshold_medium: val } : null)}
            />
          );
        }
        return <Text>{record.threshold_medium.toFixed(2)}</Text>;
      }
    },
    {
      title: 'Порог: высокий',
      key: 'high',
      width: '12%',
      render: (_: unknown, record: PolicyThreshold) => {
        if (editingThresholdId === record.id && editForm) {
          return (
            <Slider min={0} max={1} step={0.05} value={editForm.threshold_high}
              onChange={(val) => setEditForm(prev => prev ? { ...prev, threshold_high: val } : null)}
            />
          );
        }
        return <Text>{record.threshold_high.toFixed(2)}</Text>;
      }
    },
    {
      title: 'Low-Risk Strategy',
      key: 'strategy_low',
      width: '12%',
      render: (_: unknown, record: PolicyThreshold) => {
        if (editingThresholdId === record.id && editForm) {
          return (
            <Select value={editForm.strategy_low} style={{ width: '100%' }} size="small"
              onChange={(val) => setEditForm(prev => prev ? { ...prev, strategy_low: val } : null)}
            >
              {STRATEGY_OPTIONS.map(opt => (
                <Select.Option key={opt.value} value={opt.value} title={STRATEGY_DESCRIPTIONS[opt.value]}>
                  <Tooltip title={STRATEGY_DESCRIPTIONS[opt.value]} placement="right">
                    <div style={{ width: '100%' }}>{opt.label}</div>
                  </Tooltip>
                </Select.Option>
              ))}
            </Select>
          );
        }
        return (
          <Tooltip title={STRATEGY_DESCRIPTIONS[record.strategy_low]}>
            <Tag color={STRATEGY_COLORS[record.strategy_low]} style={{ cursor: 'help' }}>
              {record.strategy_low}
            </Tag>
          </Tooltip>
        );
      }
    },
    {
      title: 'Medium-Risk Strategy',
      key: 'strategy_medium',
      width: '12%',
      render: (_: unknown, record: PolicyThreshold) => {
        if (editingThresholdId === record.id && editForm) {
          return (
            <Select value={editForm.strategy_medium} style={{ width: '100%' }} size="small"
              onChange={(val) => setEditForm(prev => prev ? { ...prev, strategy_medium: val } : null)}
            >
              {STRATEGY_OPTIONS.map(opt => (
                <Select.Option key={opt.value} value={opt.value} title={STRATEGY_DESCRIPTIONS[opt.value]}>
                  <Tooltip title={STRATEGY_DESCRIPTIONS[opt.value]} placement="right">
                    <div style={{ width: '100%' }}>{opt.label}</div>
                  </Tooltip>
                </Select.Option>
              ))}
            </Select>
          );
        }
        return (
          <Tooltip title={STRATEGY_DESCRIPTIONS[record.strategy_medium]}>
            <Tag color={STRATEGY_COLORS[record.strategy_medium]} style={{ cursor: 'help' }}>
              {record.strategy_medium}
            </Tag>
          </Tooltip>
        );
      }
    },
    {
      title: 'High-Risk Strategy',
      key: 'strategy_high',
      width: '12%',
      render: (_: unknown, record: PolicyThreshold) => {
        if (editingThresholdId === record.id && editForm) {
          return (
            <Select value={editForm.strategy_high} style={{ width: '100%' }} size="small"
              onChange={(val) => setEditForm(prev => prev ? { ...prev, strategy_high: val } : null)}
            >
              {STRATEGY_OPTIONS.map(opt => (
                <Select.Option key={opt.value} value={opt.value} title={STRATEGY_DESCRIPTIONS[opt.value]}>
                  <Tooltip title={STRATEGY_DESCRIPTIONS[opt.value]} placement="right">
                    <div style={{ width: '100%' }}>{opt.label}</div>
                  </Tooltip>
                </Select.Option>
              ))}
            </Select>
          );
        }
        return (
          <Tooltip title={STRATEGY_DESCRIPTIONS[record.strategy_high]}>
            <Tag color={STRATEGY_COLORS[record.strategy_high]} style={{ cursor: 'help' }}>
              {record.strategy_high}
            </Tag>
          </Tooltip>
        );
      }
    },
    {
      title: '',
      key: 'actions',
      width: '10%',
      render: (_: unknown, record: PolicyThreshold) => {
        if (editingThresholdId === record.id && editForm) {
          const isValidOrder = editForm.threshold_low < editForm.threshold_medium && editForm.threshold_medium < editForm.threshold_high;
          return (
            <Space>
              <Button 
                type="primary" 
                size="small" 
                icon={<SaveOutlined />}
                disabled={!isValidOrder}
                onClick={() => handleSaveThreshold(record.policy_id, record.id)}
              >
                ОК
              </Button>
              <Button size="small" icon={<CloseOutlined />} onClick={handleCancelEditThreshold} />
            </Space>
          );
        }
        return (
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => handleStartEditThreshold(record)}
          >
            Изменить
          </Button>
        );
      }
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" tip="Загрузка политик безопасности..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert message="Ошибка загрузки" description={error} type="error" showIcon
          action={<a onClick={fetchData} style={{ textDecoration: 'underline' }}>Повторить</a>}
        />
      </div>
    );
  }

  // Tabs config
  const tabItems = [
    {
      key: 'thresholds',
      label: 'Пороги и стратегии',
      children: (
        <div>
          {/* Policy Selector */}
          <Space style={{ marginBottom: '16px' }} wrap size="middle">
            <Text strong>Политика:</Text>
            <Select
              value={selectedPolicyId}
              onChange={(val) => setSelectedPolicyId(val)}
              options={policies.map(p => ({ value: p.id, label: p.is_active ? `${p.name} — Активна` : p.name }))}
              style={{ width: 250 }}
            />
            {selectedPolicy && !selectedPolicy.is_active && (
              <Button type="primary" icon={<RocketOutlined />} onClick={handleActivatePolicy}>
                Активировать
              </Button>
            )}
            {selectedPolicy?.is_active && (
              <Tag color="success" style={{ padding: '4px 12px', borderRadius: '4px' }}>● Активна</Tag>
            )}
            
            <Button icon={<CopyOutlined />} onClick={handleClonePolicy}>
              Клонировать
            </Button>
            
            {selectedPolicy && !selectedPolicy.is_active && (
              <Button danger icon={<DeleteOutlined />} onClick={handleDeletePolicy}>
                Удалить
              </Button>
            )}
          </Space>

          {selectedPolicy?.description && (
            <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
              {selectedPolicy.description}
            </Paragraph>
          )}

          <Table<PolicyThreshold>
            dataSource={selectedPolicy?.thresholds ?? []}
            columns={thresholdColumns}
            rowKey="id"
            pagination={false}
            bordered
            size="small"
          />
        </div>
      )
    },
    {
      key: 'strategies',
      label: 'Шаблоны системных промптов',
      children: (
        <div>
          {strategies.length === 0 ? (
            <Empty description="Нет шаблонов стратегий" />
          ) : (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {strategies.map(s => (
                <Card
                  key={s.id}
                  title={
                    <Space>
                      <Tag color={STRATEGY_COLORS[s.strategy_code] || 'default'}>{s.strategy_code}</Tag>
                      <Switch
                        checkedChildren="Активна"
                        unCheckedChildren="Выкл."
                        checked={s.is_active}
                        onChange={(val) => handleUpdateStrategy(s.id, 'is_active', val)}
                      />
                    </Space>
                  }
                  size="small"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong style={{ display: 'block', marginBottom: '4px' }}>System Prompt:</Text>
                    <AntTextArea
                      rows={3}
                      defaultValue={s.system_prompt}
                      onBlur={(e) => {
                        if (e.target.value !== s.system_prompt) {
                          handleUpdateStrategy(s.id, 'system_prompt', e.target.value);
                        }
                      }}
                      style={{ fontFamily: 'monospace', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                      Bypass Response:
                    </Text>
                    <AntTextArea
                      rows={2}
                      defaultValue={s.user_message}
                      placeholder="Если заполнено — LLM не вызывается, это сообщение отправляется как ответ"
                      onBlur={(e) => {
                        if (e.target.value !== s.user_message) {
                          handleUpdateStrategy(s.id, 'user_message', e.target.value);
                        }
                      }}
                      style={{ fontFamily: 'monospace', fontSize: '13px' }}
                    />
                  </div>
                </Card>
              ))}
            </Space>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>Политики безопасности</Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Управление порогами решения, стратегиями реагирования и конфигурацией категорий риска. Настройки применяются без перезапуска сервера.
        </Paragraph>
      </div>

      <Card bordered={false} style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};

export default Policies;
