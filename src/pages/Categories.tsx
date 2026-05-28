import React, { useState, useEffect } from 'react';
import {
  Card, Table, Typography, Tag, Switch, Space, Spin, Alert,
  Button, Modal, Form, Input, InputNumber, message
} from 'antd';
import { PlusOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { RiskCategory } from '../types.ts';
import { API_BASE } from '../types.ts';

const { Title, Paragraph, Text } = Typography;

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<RiskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/categories`);
      if (!response.ok) throw new Error('Не удалось загрузить категории');
      const data: RiskCategory[] = await response.json();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (cat: RiskCategory) => {
    try {
      const response = await fetch(`${API_BASE}/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !cat.is_active })
      });
      if (!response.ok) throw new Error('Ошибка обновления');
      const updated: RiskCategory = await response.json();
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      message.success(`Категория ${updated.code}: ${updated.is_active ? 'активирована' : 'деактивирована'}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleUpdateField = async (catId: number, field: string, value: string | number) => {
    try {
      const response = await fetch(`${API_BASE}/categories/${catId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (!response.ok) throw new Error('Ошибка обновления');
      const updated: RiskCategory = await response.json();
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      message.success(`Категория ${updated.code} обновлена`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleCreateCategory = async () => {
    try {
      const values = await form.validateFields();
      const response = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Ошибка создания');
      }
      const created: RiskCategory = await response.json();
      setCategories(prev => [...prev, created]);
      setModalOpen(false);
      form.resetFields();
      message.success(`Категория ${created.code} создана!`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const columns: ColumnsType<RiskCategory> = [
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'active',
      width: 80,
      render: (_: boolean, record: RiskCategory) => (
        <Switch checked={record.is_active} onChange={() => handleToggle(record)} />
      )
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (text: string) => <Tag color="blue" style={{ fontWeight: 600 }}>{text}</Tag>
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: RiskCategory) => (
        <Text editable={{ onChange: (val) => handleUpdateField(record.id, 'name', val) }}>
          {text}
        </Text>
      )
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (text: string, record: RiskCategory) => (
        <Text editable={{ onChange: (val) => handleUpdateField(record.id, 'description', val) }} type="secondary">
          {text || '—'}
        </Text>
      )
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      sorter: (a, b) => a.priority - b.priority,
      render: (val: number, record: RiskCategory) => (
        <InputNumber 
          size="small" 
          value={val} 
          min={0} 
          max={100} 
          onChange={(v) => v !== null && handleUpdateField(record.id, 'priority', v)} 
          style={{ width: '70px' }}
        />
      )
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" tip="Загрузка категорий риска..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>Категории риска</Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Управление таксономией рисков: включение/отключение категорий, редактирование приоритетов и описаний.
        </Paragraph>
      </div>

      {error && <Alert message="Ошибка" description={error} type="error" showIcon style={{ marginBottom: '16px' }} />}

      <Card bordered={false} style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <Table<RiskCategory>
          dataSource={categories}
          columns={columns}
          rowKey="id"
          pagination={false}
          bordered
          size="middle"
        />
      </Card>
    </div>
  );
};

export default Categories;
