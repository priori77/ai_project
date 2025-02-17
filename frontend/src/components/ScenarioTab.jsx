import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  List,
  ListItem,
  CircularProgress,
  Divider,
  Avatar,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy'; // 시나리오 AI(어시스턴트) 아이콘
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { scenarioApi } from '../api/api'; // api.js에 scenarioApi 추가 필요

function ScenarioTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 스크롤 하단 유지
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 날짜/시간 포맷
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${mm}-${dd}`;
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
  };

  // 메시지 전송
  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    setInput('');
    setLoading(true);

    // 사용자 메시지 생성
    const userMessage = {
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await scenarioApi.scenarioChat(userText);
      if (response.data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // 오류 메시지
        const errorMessage = {
          role: 'assistant',
          content: `오류: ${response.data.error || '알 수 없는 오류'}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      // 네트워크 오류
      const networkErrorMessage = {
        role: 'assistant',
        content: `네트워크 오류: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, networkErrorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 채팅 메시지 렌더링
  const renderMessageItem = (message, index, previousDate) => {
    const currentDate = formatDate(message.timestamp);
    const showDateDivider = currentDate !== previousDate;

    const isUser = message.role === 'user';

    return (
      <React.Fragment key={index}>
        {/* 날짜 구분선 (이전 날짜와 다를 때만) */}
        {showDateDivider && (
          <ListItem sx={{ justifyContent: 'center', py: 1 }}>
            <Divider sx={{ flexGrow: 1, mr: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {currentDate}
            </Typography>
            <Divider sx={{ flexGrow: 1, ml: 1 }} />
          </ListItem>
        )}

        {/* 실제 메시지 */}
        <ListItem
          sx={{
            flexDirection: 'column',
            alignItems: isUser ? 'flex-end' : 'flex-start',
            mb: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              flexDirection: isUser ? 'row-reverse' : 'row',
              width: '100%',
              gap: 1,
            }}
          >
            {/* 아바타 */}
            <Avatar
              sx={{
                bgcolor: isUser ? 'secondary.main' : 'primary.main',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '& .MuiSvgIcon-root': {
                  fontSize: '20px',
                  verticalAlign: 'middle',
                },
              }}
            >
              {isUser ? <PersonIcon /> : <SmartToyIcon />}
            </Avatar>

            {/* 채팅 버블 */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                maxWidth: '80%',
                borderRadius: 2,
                boxShadow: 1,
                cursor: 'pointer',
                backgroundColor: isUser ? '#d0ebff' : '#ffffff',
              }}
            >
              {loading && index === messages.length - 1 && isUser && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: isUser ? 'auto' : 40,
                    right: isUser ? 40 : 'auto',
                  }}
                >
                  <CircularProgress size={20} />
                </Box>
              )}

              {/* 타임스탬프 */}
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5 }}>
                {formatTime(message.timestamp)}
              </Typography>

              {/* 본문: 마크다운 렌더링 (ChatbotTab 스타일) */}
              <Box
                sx={{
                  color: isUser ? 'black' : 'text.primary',
                  '& p': { margin: 0, lineHeight: 1.5 },
                  '& p:not(:last-child)': { marginBottom: 2 },
                  '& ul, & ol': {
                    margin: '1rem 0',
                    paddingLeft: '1.5rem',
                    listStylePosition: 'outside',
                  },
                  '& li': {
                    marginBottom: '0.5rem',
                    lineHeight: 1.5,
                  },
                  wordBreak: 'keep-all',
                  width: '100%',
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ node, ...props }) => (
                      <Typography variant="body2" {...props} />
                    ),
                    h1: ({ node, ...props }) => (
                      <Typography variant="h6" gutterBottom {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <Typography variant="subtitle1" gutterBottom {...props} />
                    ),
                    // 필요하면 h3, h4 등도 추가
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </Box>
            </Paper>
          </Box>
        </ListItem>
      </React.Fragment>
    );
  };

  return (
    <Box
      sx={{
        maxWidth: '1200px',
        width: '100%',
        mx: 'auto',
        p: 3,
        height: 'calc(100vh - 100px)',
      }}
    >
      {/* 상단 헤더 */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">게임 시나리오 어시스턴트</Typography>
      </Paper>

      {/* 채팅 목록 영역 */}
      <Paper sx={{ height: 'calc(100vh - 250px)', overflow: 'auto', p: 2, mb: 2 }}>
        <List>
          {messages.map((message, idx) => {
            const prevMsg = messages[idx - 1];
            const prevDate = prevMsg ? formatDate(prevMsg.timestamp || '') : null;
            return renderMessageItem(message, idx, prevDate);
          })}
          <div ref={messagesEndRef} />
        </List>
      </Paper>

      {/* 입력 + 전송 버튼 */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="게임 내 스토리, 인물, 설정에 관한 질문을 입력하세요..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          multiline
          maxRows={4}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={loading}
          inputProps={{
            style: { fontSize: '0.9rem', lineHeight: '1.4' },
          }}
          sx={{
            '& .MuiInputBase-root': {
              minHeight: '48px',
              alignItems: 'center',
            },
          }}
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          sx={{
            height: '48px',
            minWidth: '80px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? (
            <CircularProgress size={20} />
          ) : (
            <>
              <SendIcon style={{ fontSize: '1rem' }} />
              <span style={{ fontSize: '0.9rem' }}>전송</span>
            </>
          )}
        </Button>
      </Box>
    </Box>
  );
}

export default ScenarioTab;
