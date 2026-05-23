import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Input, Button, List, Avatar, Badge, Progress, Space, Typography, Tag, Divider } from 'antd';
import { 
  SendOutlined, 
  UserOutlined, 
  RobotOutlined, 
  SafetyOutlined, 
  ClockCircleOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const STRATEGY_METADATA = {
  ALLOW: { label: 'Разрешить (ALLOW)', color: 'success', desc: 'Запрос безопасен. Ответ генерируется стандартно.' },
  SOFTEN: { label: 'Смягчение (SOFTEN)', color: 'processing', desc: 'Нейтральный тон ответа, сниженная детализация.' },
  CAUTION: { label: 'Предупреждение (CAUTION)', color: 'warning', desc: 'В ответ будет добавлено предупреждение об ограничениях.' },
  CLARIFY: { label: 'Уточнение (CLARIFY)', color: 'warning', desc: 'Запрос на уточнение намерений пользователя.' },
  REDIRECT: { label: 'Перенаправление (REDIRECT)', color: 'purple', desc: 'Рекомендация обратиться к эксперту/специалисту.' },
  REFUSE: { label: 'Отказ (REFUSE)', color: 'error', desc: 'Корректный вежливый отказ в ответе на запрос.' },
};

const CATEGORY_NAMES = {
  HARMFUL: 'Опасные инструкции (HARMFUL)',
  VIOLENCE: 'Насилие и жестокость (VIOLENCE)',
  HATE: 'Язык вражды (HATE)',
  MEDICAL: 'Медицинские советы (MEDICAL)',
  LEGAL: 'Юридические консультации (LEGAL)',
  PII: 'Персональные данные (PII)',
  MISINFO: 'Дезинформация (MISINFO)',
  NSFW: 'Взрослый контент (NSFW)',
  SELFHARM: 'Селфхарм (SELFHARM)',
  SENSITIVE: 'Чувствительные темы (SENSITIVE)',
};

const Chat = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Привет! Я ваш безопасный ИИ-ассистент, защищенный контекстным шлюзом. Напишите ваш запрос, и я отвечу вам с учетом правил безопасности.' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [ws, setWs] = useState(null);
  
  // Real-time security metrics state
  const [securityPanel, setSecurityPanel] = useState({
    active: false,
    strategy: 'ALLOW',
    piiDetected: false,
    scores: {},
    latency: 0,
    isMock: false,
    bypassed: false
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  useEffect(() => {
    // Setup websocket connection
    const socket = new WebSocket('ws://localhost:8000/api/v1/chat/ws');
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'strategy') {
        // Initial classification strategy response
        setSecurityPanel(prev => ({
          ...prev,
          active: true,
          strategy: data.strategy,
          piiDetected: data.pii_detected,
          scores: {} // will be filled in metadata at the end
        }));
      } 
      else if (data.type === 'token') {
        // Stream token
        setStreamingMessage(prev => (prev === null ? data.content : prev + data.content));
      } 
      else if (data.type === 'metadata') {
        // Final transaction metadata
        setSecurityPanel(prev => ({
          ...prev,
          scores: data.scores,
          latency: data.latency_ms,
          isMock: data.is_mock,
          bypassed: data.bypassed
        }));
        
        // Finalize streaming message into messages array
        setStreamingMessage(currentStream => {
          if (currentStream !== null) {
            setMessages(prevMsgs => [...prevMsgs, { role: 'assistant', content: currentStream }]);
          }
          return null;
        });
        
        setIsSending(false);
      } 
      else if (data.type === 'error') {
        console.error('WebSocket error event:', data.content);
        setMessages(prevMsgs => [...prevMsgs, { role: 'assistant', content: `[Ошибка: ${data.content}]` }]);
        setIsSending(false);
      }
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  const handleSend = () => {
    if (!inputVal.trim() || isSending) return;
    
    const userText = inputVal.trim();
    setInputVal('');
    setIsSending(true);
    setStreamingMessage(''); // Initialize streaming state
    
    // Add user message to local state
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);

    // Prepare history payload for backend (exclude system prompts or error tags)
    const history = messages
      .filter(msg => !msg.content.startsWith('[Ошибка:'))
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        message: userText,
        history: history
      }));
    } else {
      console.error('WS not connected');
      setMessages(prev => [...prev, { role: 'assistant', content: '[Ошибка соединения: Веб-сокет не активен. Пожалуйста, обновите страницу.]' }]);
      setIsSending(false);
      setStreamingMessage(null);
    }
  };

  const getProgressColor = (score) => {
    if (score >= 0.6) return '#ef4444'; // Red
    if (score >= 0.3) return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '16px' }}>
        <Title level={2} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>Тестовый чат</Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Интерфейс для проверки работы классификатора рисков и наложения адаптивных политик безопасности.
        </Paragraph>
      </div>

      <Row gutter={16} style={{ flex: 1, minHeight: 0 }}>
        {/* Left Column: Chat Window */}
        <Col xs={24} md={14} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Card 
            bordered={false} 
            bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
          >
            {/* Scrollable Message List */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', paddingRight: '8px' }}>
              <List
                dataSource={[...messages, ...(streamingMessage !== null ? [{ role: 'assistant', content: streamingMessage, isStreaming: true }] : [])]}
                renderItem={(item) => (
                  <List.Item style={{ 
                    borderBottom: 'none', 
                    padding: '12px 0',
                    justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start'
                  }}>
                    <Space 
                      align="start" 
                      style={{ 
                        maxWidth: '85%', 
                        flexDirection: item.role === 'user' ? 'row-reverse' : 'row' 
                      }}
                    >
                      <Avatar 
                        icon={item.role === 'user' ? <UserOutlined /> : <RobotOutlined />} 
                        style={{ 
                          backgroundColor: item.role === 'user' ? '#6366f1' : '#10b981',
                          marginTop: '4px' 
                        }} 
                      />
                      <div style={{ 
                        padding: '12px 16px', 
                        borderRadius: '12px', 
                        backgroundColor: item.role === 'user' ? '#e0e7ff' : '#f1f5f9',
                        color: '#1e293b',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {item.content}
                        {item.isStreaming && <span style={{ display: 'inline-block', width: '2px', height: '15px', backgroundColor: '#10b981', marginLeft: '2px', animation: 'pulseHighlight 1s infinite' }} />}
                      </div>
                    </Space>
                  </List.Item>
                )}
              />
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <TextArea
                rows={2}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Задайте любой вопрос ИИ-ассистенту..."
                disabled={isSending}
                style={{ resize: 'none', borderRadius: '8px' }}
              />
              <Button 
                type="primary" 
                shape="round"
                icon={<SendOutlined />} 
                onClick={handleSend}
                loading={isSending}
                style={{ height: 'auto', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: '#4f46e5' }}
              >
                Отправить
              </Button>
            </div>
          </Card>
        </Col>

        {/* Right Column: Live Security Panel */}
        <Col xs={24} md={10} style={{ height: '100%' }}>
          <Card 
            title={
              <Space>
                <SafetyOutlined style={{ color: '#4f46e5' }} />
                <span>Live Security Panel</span>
              </Space>
            } 
            bordered={false}
            bodyStyle={{ overflowY: 'auto', height: 'calc(100% - 58px)', boxSizing: 'border-box' }}
            style={{ height: '100%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
          >
            {securityPanel.active ? (
              <div>
                {/* Stats Header */}
                <Row gutter={8} style={{ marginBottom: '16px' }}>
                  <Col span={12}>
                    <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f8fafc' }}>
                      <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>ЗАДЕРЖКА</Text>
                      <Space size={4}>
                        <ClockCircleOutlined style={{ color: '#94a3b8', fontSize: '12px' }} />
                        <Text strong style={{ fontSize: '14px' }}>
                          {securityPanel.latency ? `${securityPanel.latency} мс` : '...'}
                        </Text>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f8fafc' }}>
                      <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>ДЕТЕКЦИЯ PII</Text>
                      {securityPanel.piiDetected ? (
                        <Tag color="error" icon={<EyeInvisibleOutlined />} style={{ margin: 0 }}>Найдено / Замаскировано</Tag>
                      ) : (
                        <Tag color="success" style={{ margin: 0 }}>Не найдено</Tag>
                      )}
                    </Card>
                  </Col>
                </Row>

                {/* Strategy Card */}
                <Card size="small" style={{ marginBottom: '16px', borderLeft: '4px solid', borderLeftColor: securityPanel.strategy === 'ALLOW' ? '#10b981' : '#ef4444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: '12px' }}>ПРИМЕНЕННАЯ СТРАТЕГИЯ:</Text>
                    <Tag color={STRATEGY_METADATA[securityPanel.strategy]?.color || 'default'}>
                      {STRATEGY_METADATA[securityPanel.strategy]?.label || securityPanel.strategy}
                    </Tag>
                  </div>
                  <Paragraph style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    {STRATEGY_METADATA[securityPanel.strategy]?.desc}
                  </Paragraph>
                  {securityPanel.isMock && (
                    <div style={{ marginTop: '8px' }}>
                      <Tag color="warning" style={{ fontSize: '10px' }}>Режим симуляции (Mock LLM)</Tag>
                    </div>
                  )}
                </Card>

                <Divider style={{ margin: '12px 0' }}>Оценки вероятностей рисков</Divider>

                {/* Risk Category Scores */}
                {Object.keys(CATEGORY_NAMES).map((catCode) => {
                  const score = securityPanel.scores[catCode] !== undefined ? securityPanel.scores[catCode] : 0.0;
                  return (
                    <div key={catCode} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                        <Text style={{ color: '#475569', fontWeight: score >= 0.3 ? 600 : 400 }}>
                          {CATEGORY_NAMES[catCode]}
                        </Text>
                        <Text strong style={{ color: getProgressColor(score) }}>
                          {(score * 100).toFixed(0)}%
                        </Text>
                      </div>
                      <Progress 
                        percent={parseFloat((score * 100).toFixed(0))} 
                        showInfo={false}
                        strokeColor={getProgressColor(score)}
                        trailColor="#e2e8f0"
                        size="small"
                        style={{ margin: 0 }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', padding: '16px', textAlign: 'center' }}>
                <SafetyOutlined style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
                <Text type="secondary">
                  Здесь в реальном времени будут отображаться оценки вероятностей рисков, задержка фильтрации и наложенные политики безопасности после отправки запроса.
                </Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Chat;
