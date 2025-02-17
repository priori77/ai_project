// frontend/src/api/api.js
import axios from 'axios';

// 백엔드 서버 기본 URL 설정
const API_BASE_URL = 'http://localhost:5000';  // 백엔드 서버 주소로 수정

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000,
  withCredentials: true  // 쿠키/세션 지원
});

export const scenarioApi = {
  getScenarios: () => api.get('/scenario'),
  createScenario: (data) => api.post('/scenario', data),
  analyzeScenario: (id, data) => api.post(`/scenario/${id}/analyze`, data),
  scenarioChat: (message) => {
    return api.post('/scenario/chat', { message });
  },
};

export const reviewApi = {
  // '/api' 제거하고 review_routes.py의 경로와 맞춤
  searchGames: (query) => api.get('/review/search/games', { params: { q: query } }),
  getSteamReviews: (appId, params = {}) => api.get(`/review/steam/${appId}`, { params }),
  analyzeReviews: (data) => api.post('/review/analyze', data),
};

export const chatbotApi = {
  sendMessage: (message, designerType) => api.post('/chatbot/chat', { message, designerType }, {
    withCredentials: true
  }),
  getChatHistory: () => api.get('/chatbot/history', {
    withCredentials: true
  }),
  clearChat: () => api.post('/chatbot/clear', {}, {
    withCredentials: true
  })
};

export default api;