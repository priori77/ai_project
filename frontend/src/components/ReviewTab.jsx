// frontend/src/components/ReviewTab.jsx
import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  Divider,
  Chip,
  FormControlLabel,
  Switch
} from '@mui/material';
import { reviewApi } from '../api/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import ReviewSettings from './ReviewSettings';
import ReviewAnalysisResults from './ReviewAnalysisResults';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function ReviewTab({ reviewState, setReviewState }) {
  const {
    searchResults,
    selectedGame,
    reviews,
    analysisResult,
    loading,
    error
  } = reviewState;

  const [searchQuery, setSearchQuery] = React.useState('');
  const [reviewLanguage, setReviewLanguage] = React.useState('koreana');
  const [reviewOptions, setReviewOptions] = React.useState({
    language: 'koreana',
    filter: 'all',
    num_per_page: 100,
    review_type: 'all',
    purchase_type: 'all',
    day_range: '365'  // 기본값 1년
  });
  const [reviewSettings, setReviewSettings] = React.useState({
    language: 'all',
    review_type: 'all',
    day_range: 30
  });
  const [analyzing, setAnalyzing] = React.useState(false);

  const handleSearchGames = async () => {
    if (!searchQuery.trim()) return;
    
    setReviewState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('[DEBUG] 게임 검색 시작:', searchQuery);
      const res = await reviewApi.searchGames(searchQuery);
      console.log('[DEBUG] 검색 응답:', res.data);
      
      if (res.data.success) {
        if (res.data.games.length === 0) {
          setReviewState(prev => ({ ...prev, error: '검색 결과가 없습니다.' }));
        } else {
          setReviewState(prev => ({
            ...prev,
            searchResults: res.data.games,
            loading: false
          }));
        }
      } else {
        setReviewState(prev => ({
          ...prev,
          error: res.data.error || '게임 검색에 실패했습니다.'
        }));
      }
    } catch (error) {
      console.error('[DEBUG] 게임 검색 오류:', error);
      if (error.response) {
        console.error('[DEBUG] 오류 응답:', error.response.data);
        setReviewState(prev => ({
          ...prev,
          error: error.response.data.error || '게임 검색 중 오류가 발생했습니다.'
        }));
      } else if (error.request) {
        setReviewState(prev => ({ ...prev, error: '서버에 연결할 수 없습니다.' }));
      } else {
        setReviewState(prev => ({ ...prev, error: '게임 검색 중 오류가 발생했습니다.' }));
      }
    } finally {
      setReviewState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSelectGame = (game) => {
    setReviewState(prev => ({
      ...prev,
      selectedGame: game,
      searchResults: [],
      searchQuery: '',
      loading: true,
      error: null
    }));
  };

  const handleFetchReviews = async () => {
    if (!selectedGame) return;
    setReviewState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await reviewApi.getSteamReviews(selectedGame.appid, reviewOptions);
      if (res.data && res.data.success === 1) {
        setReviewState(prev => ({
          ...prev,
          reviews: res.data.reviews || [],
          loading: false
        }));
      } else {
        setReviewState(prev => ({ ...prev, error: '리뷰를 가져오는데 실패했습니다.' }));
      }
    } catch (error) {
      setReviewState(prev => ({ ...prev, error: '리뷰를 가져오는 중 오류가 발생했습니다.' }));
      console.error(error);
    } finally {
      setReviewState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleAnalyzeReviews = async (e) => {
    e.preventDefault();
    if (!selectedGame) return;

    setReviewState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const payload = {
        app_id: selectedGame.appid,
        settings: {
          language: reviewSettings.language,
          review_type: reviewSettings.review_type,
          day_range: parseInt(reviewSettings.day_range)
        },
        use_gpt: reviewSettings.use_gpt
      };

      console.log('[DEBUG] 리뷰 분석 요청:', payload);
      const res = await reviewApi.analyzeReviews(payload);

      if (res.data.success && (!res.data.reviews || res.data.reviews.length === 0)) {
        setReviewState(prev => ({
          ...prev,
          analysisResult: {
            success: true,
            message: `선택한 기간(${reviewSettings.day_range}일) 동안의 리뷰가 없습니다.`,
            summary_stats: {
              total_reviews: 0,
              positive_count: 0,
              negative_count: 0
            }
          },
          loading: false
        }));
        return;
      }

      if (res.data.success && res.data.reviews?.length > 0) {
        console.log('[DEBUG] 분석 결과:', res.data);
        setReviewState(prev => ({
          ...prev,
          analysisResult: res.data,
          loading: false
        }));
        
        if (res.data.gpt_error) {
          setReviewState(prev => ({
            ...prev,
            error: {
              severity: 'warning',
              message: `리뷰 분석은 완료되었으나, AI 분석 중 오류가 발생했습니다: ${res.data.gpt_error}`
            }
          }));
        }
      } else {
        setReviewState(prev => ({
          ...prev,
          error: {
            severity: 'error',
            message: res.data.error || '리뷰 데이터를 분석하는 중 오류가 발생했습니다.'
          },
          loading: false
        }));
      }
    } catch (error) {
      console.error('[DEBUG] 분석 오류:', error);
      setReviewState(prev => ({
        ...prev,
        error: {
          severity: 'error',
          message: error.response?.data?.error || '서버 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        },
        loading: false
      }));
    }
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '리뷰 트렌드'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(1)}${context.dataset.yAxisID === 'y2' ? '%' : '개'}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MM/DD'
          }
        },
        title: {
          display: true,
          text: '날짜'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: '리뷰 수'
        }
      },
      y2: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: '긍정 비율 (%)'
        },
        grid: {
          drawOnChartArea: false
        }
      }
    }
  };

  const renderReviewOptions = () => (
    <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 1, flexWrap: 'wrap' }}>
      <FormControl size="small">
        <InputLabel>리뷰 언어</InputLabel>
        <Select
          value={reviewOptions.language}
          label="리뷰 언어"
          onChange={(e) => setReviewOptions(prev => ({
            ...prev,
            language: e.target.value
          }))}
        >
          <MenuItem value="koreana">한국어</MenuItem>
          <MenuItem value="english">영어</MenuItem>
          <MenuItem value="all">모든 언어 (한/영)</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel>리뷰 필터</InputLabel>
        <Select
          value={reviewOptions.filter}
          label="리뷰 필터"
          onChange={(e) => setReviewOptions(prev => ({
            ...prev,
            filter: e.target.value
          }))}
        >
          <MenuItem value="all">전체 리뷰</MenuItem>
          <MenuItem value="recent">최근 리뷰</MenuItem>
          <MenuItem value="updated">업데이트된 리뷰</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel>리뷰 개수</InputLabel>
        <Select
          value={reviewOptions.num_per_page}
          label="리뷰 개수"
          onChange={(e) => setReviewOptions(prev => ({
            ...prev,
            num_per_page: e.target.value
          }))}
        >
          <MenuItem value={20}>20개</MenuItem>
          <MenuItem value={50}>50개</MenuItem>
          <MenuItem value={100}>100개</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel>기간</InputLabel>
        <Select
          value={reviewOptions.day_range}
          label="기간"
          onChange={(e) => setReviewOptions(prev => ({
            ...prev,
            day_range: e.target.value
          }))}
        >
          <MenuItem value="30">최근 30일</MenuItem>
          <MenuItem value="90">최근 3개월</MenuItem>
          <MenuItem value="180">최근 6개월</MenuItem>
          <MenuItem value="365">최근 1년</MenuItem>
          <MenuItem value="730">최근 2년</MenuItem>
          <MenuItem value="all">전체 기간</MenuItem>
        </Select>
      </FormControl>

      <Button 
        variant="contained" 
        onClick={handleFetchReviews}
        disabled={loading}
      >
        리뷰 불러오기
      </Button>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          게임 검색
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="게임 이름 입력"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleSearchGames}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={24} /> : '검색'}
          </Button>
        </Box>

        {searchResults.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              검색 결과 ({searchResults.length}개)
            </Typography>
            <List sx={{ 
              maxHeight: 400, 
              overflow: 'auto',
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider'
            }}>
              {searchResults.map((game) => (
                <ListItem
                  key={game.appid}
                  alignItems="flex-start"
                  button
                  onClick={() => handleSelectGame(game)}
                  sx={{ 
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    height: '80px',  // 높이 고정
                    display: 'flex',
                    alignItems: 'center',  // 수직 중앙 정렬
                    '& .MuiListItemAvatar-root': {
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      alt={game.name} 
                      src={game.image}
                      variant="square"
                      sx={{ width: 64, height: 64 }}
                    />
                  </ListItemAvatar>
                  <Box sx={{ width: 16 }} />
                  <ListItemText
                    sx={{
                      margin: 0,  // 기본 마진 제거
                      '& .MuiListItemText-primary': {
                        fontSize: '1rem',
                        fontWeight: 500
                      },
                      '& .MuiListItemText-secondary': {
                        fontSize: '0.875rem'
                      }
                    }}
                    primary={game.name}
                    secondary={
                      (() => {
                        if (game.is_free) return '무료';
                        if (game.formatted_price) return game.formatted_price;
                        if (game.price > 0) {
                          // Steam API는 가격을 최소 단위로 제공하므로 100으로 나눔
                          const priceInWon = Math.floor(game.price / 100);
                          return `₩${priceInWon.toLocaleString()}`;
                        }
                        return '가격 정보 없음';
                      })()
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>

      {selectedGame && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              {selectedGame.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              App ID: {selectedGame.appid}
            </Typography>

            <form onSubmit={handleAnalyzeReviews}>
              <ReviewSettings 
                settings={reviewSettings}
                onSettingsChange={(key, value) => 
                  setReviewSettings(prev => ({ ...prev, [key]: value }))
                }
              />

              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between'
                }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={analyzing}
                    startIcon={analyzing ? <CircularProgress size={20} /> : null}
                  >
                    {analyzing ? '분석 중...' : '리뷰 분석 시작'}
                  </Button>
                </Box>
              </Paper>
            </form>

            {error && (
              <Alert severity={error.severity} sx={{ mb: 3 }}>
                {error.message}
              </Alert>
            )}

            {analysisResult && (
              <ReviewAnalysisResults 
                analyzeResult={analysisResult}
              />
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}

export default ReviewTab;