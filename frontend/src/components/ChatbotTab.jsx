import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Box, 
  TextField, 
  Button, 
  Typography,
  List,
  ListItem,
  CircularProgress,
  IconButton,
  Avatar,
  Paper,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import MapIcon from '@mui/icons-material/Map';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BuildIcon from '@mui/icons-material/Build';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { chatbotApi } from '../api/api';

const DESIGNER_ICONS = {
  "레벨 디자이너": MapIcon,
  "시스템 디자이너": SettingsIcon,
  "퀘스트 디자이너": AssignmentIcon,
  "내러티브 디자이너": MenuBookIcon,
  "범용": BuildIcon
};

function ChatbotTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [designerType, setDesignerType] = useState("범용");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const theme = useTheme();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadChatHistory();
  }, []);

  // 화면 하단 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 채팅 이력 불러오기
  const loadChatHistory = async () => {
    try {
      const response = await chatbotApi.getChatHistory();
      if (response.data.success) {
        setMessages(response.data.history || []);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  // 날짜 및 시간 포매팅 함수
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

    const userMessage = input;
    setInput('');

    const userMessageObj = { 
      role: 'user', 
      content: userMessage, 
      designerType, 
      timestamp: new Date().toISOString() 
    };
    setMessages(prev => [...prev, userMessageObj]);
    setLoading(true);

    try {
      const response = await chatbotApi.sendMessage(userMessage, designerType);
      if (response.data.success) {
        const assistantMessageObj = {
          role: 'assistant',
          content: response.data.message,
          designerType: response.data.designer_type || designerType,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessageObj]);
      } else {
        const errorMessageObj = {
          role: 'assistant',
          content: `오류가 발생했습니다: ${response.data.error || '알 수 없는 오류'}`,
          designerType,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessageObj]);
      }
    } catch (error) {
      console.error('Network error:', error);
      const errorMessageObj = {
        role: 'assistant',
        content: error.response?.data?.error || error.message || '서버 연결 오류가 발생했습니다',
        designerType: '범용',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setLoading(false);
    }
  };

  // 대화 내역 삭제
  const handleClearChat = async () => {
    try {
      await chatbotApi.clearChat();
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  // 메시지에 표시할 아이콘 결정
  const getDesignerIcon = (message) => {
    if (message.role !== 'assistant') return <PersonIcon />;
    const IconComponent = DESIGNER_ICONS[message.designerType] || DESIGNER_ICONS['범용'];
    return <IconComponent />;
  };

  // 메시지 하나씩 렌더링 (날짜 구분선 포함)
  const renderMessageItem = (message, index, previousDate) => {
    const currentDate = formatDate(message.timestamp || new Date().toISOString());
    const showDateDivider = currentDate !== previousDate;

    return (
      <React.Fragment key={index}>
        {showDateDivider && (
          <ListItem sx={{ justifyContent: 'center', py: 1 }}>
            <Divider sx={{ flexGrow: 1, mr: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {currentDate}
            </Typography>
            <Divider sx={{ flexGrow: 1, ml: 1 }} />
          </ListItem>
        )}
        <ListItem
          sx={{
            flexDirection: 'column',
            alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
            mb: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
              width: '100%',
              gap: 1,
            }}
          >
            <Avatar
              sx={{
                bgcolor: message.role === 'assistant' ? 'primary.main' : 'secondary.main',
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
              {getDesignerIcon(message)}
            </Avatar>

            {/* 채팅 버블: Paper 컴포넌트로 상자 효과 적용 */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                maxWidth: '80%',
                borderRadius: 2,
                boxShadow: 1,
                cursor: 'pointer',
                backgroundColor: message.role === 'assistant' ? '#ffffff' : '#d0ebff',
              }}
            >
              {loading && index === messages.length - 1 && message.role === 'user' && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: message.role === 'user' ? 'auto' : 40,
                    right: message.role === 'user' ? 40 : 'auto',
                  }}
                >
                  <CircularProgress size={20} />
                </Box>
              )}

              {/* 타임스탬프 */}
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5 }}>
                {formatTime(message.timestamp || new Date().toISOString())}
              </Typography>

              <Box
                sx={{
                  color: message.role === 'user' ? 'black' : 'text.primary',
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
      className="m-auto text-base py-[18px] px-6"
    >
      {/* 상단 헤더 */}
      <Box
        sx={{
          p: 2,
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.palette.grey[100],
          borderRadius: 1,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            '& .MuiSvgIcon-root': {
              fontSize: '24px',
              verticalAlign: 'middle',
              display: 'inline-flex',
            },
          }}
        >
          <SportsEsportsIcon />
          게임 디자인 어시스턴트
        </Typography>
        <FormControl size="small" sx={{ minWidth: 180, ml: 2 }}>
          <InputLabel id="designer-type-label">디자이너 타입</InputLabel>
          <Select
            labelId="designer-type-label"
            value={designerType}
            label="디자이너 타입"
            onChange={(e) => setDesignerType(e.target.value)}
          >
            {Object.keys(DESIGNER_ICONS).map((type) => (
              <MenuItem
                key={type}
                value={type}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  '& .MuiSvgIcon-root': {
                    fontSize: '20px',
                    verticalAlign: 'middle',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1,
                  },
                }}
              >
                {React.createElement(DESIGNER_ICONS[type])}
                <span style={{ verticalAlign: 'middle' }}>{type}</span>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton onClick={handleClearChat} color="error">
          <DeleteIcon />
        </IconButton>
      </Box>

      {/* 채팅 리스트 영역 */}
      <Box
        sx={{
          height: 'calc(100vh - 250px)',
          overflow: 'auto',
          p: 2,
          mb: 2,
          backgroundColor: theme.palette.grey[200],
          borderRadius: 1,
        }}
        className="mx-auto flex flex-1 text-base gap-4 md:gap-5 lg:gap-6"
      >
        <List sx={{ width: '100%' }}>
          {messages.map((message, index) => {
            const prevMessage = messages[index - 1];
            const prevDate = prevMessage
              ? formatDate(prevMessage.timestamp || new Date().toISOString())
              : null;
            return renderMessageItem(message, index, prevDate);
          })}
          <div ref={messagesEndRef} />
        </List>
      </Box>

      {/* 입력창 + 전송 버튼 */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="메시지를 입력하세요..."
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SendIcon style={{ fontSize: '1rem' }} />
              <span style={{ fontSize: '0.9rem' }}>전송</span>
            </Box>
          )}
        </Button>
      </Box>
    </Box>
  );
}

export default ChatbotTab;