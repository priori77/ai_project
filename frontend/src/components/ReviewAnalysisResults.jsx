import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Grid,
  Divider,
  Alert,
} from '@mui/material';
import { Line, Pie, Bar } from 'react-chartjs-2';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';  // GitHub Flavored Markdown 지원
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Chart.js 컴포넌트 등록
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function MarkdownContent({ children }) {
  return (
    <Box sx={{ 
      mt: 2,
      '& pre': { 
        whiteSpace: 'pre-wrap', 
        wordBreak: 'break-word',
        backgroundColor: 'background.paper',
        padding: 2,
        borderRadius: 1
      },
      '& ul': { paddingLeft: 3 },
      '& li': { marginBottom: 0.5 },
      '& h2': { 
        color: 'primary.main',
        fontSize: '1.2rem',
        marginTop: 3,
        marginBottom: 1
      }
    }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </Box>
  );
}

export default function ReviewAnalysisResults({ analyzeResult, useGpt }) {
  const [tabValue, setTabValue] = useState(0);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // 파이차트 데이터
  const pieData = {
    labels: ['긍정적', '부정적'],
    datasets: [{
      data: [
        analyzeResult.summary_stats.positive_count,
        analyzeResult.summary_stats.negative_count
      ],
      backgroundColor: ['rgba(75, 192, 192, 0.8)', 'rgba(255, 99, 132, 0.8)'],
      borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
      borderWidth: 1,
    }]
  };

  // 키워드 빈도 막대그래프 데이터
  const getTopKeywords = (freqData, limit = 10) => {
    return Object.entries(freqData || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
  };

  const positiveBarData = {
    labels: getTopKeywords(analyzeResult.wordcloud?.pos_freq).map(([word]) => word),
    datasets: [{
      label: '빈도수',
      data: getTopKeywords(analyzeResult.wordcloud?.pos_freq).map(([, freq]) => freq),
      backgroundColor: 'rgba(75, 192, 192, 0.8)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1,
    }]
  };

  const negativeBarData = {
    labels: getTopKeywords(analyzeResult.wordcloud?.neg_freq).map(([word]) => word),
    datasets: [{
      label: '빈도수',
      data: getTopKeywords(analyzeResult.wordcloud?.neg_freq).map(([, freq]) => freq),
      backgroundColor: 'rgba(255, 99, 132, 0.8)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 1,
    }]
  };

  if (!analyzeResult) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body1">
          분석 결과를 불러오는 중입니다...
        </Typography>
      </Box>
    );
  }

  if (!analyzeResult.summary_stats?.total_reviews) {
    return (
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          {analyzeResult.message || '해당 기간에 작성된 리뷰를 찾을 수 없습니다.'}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          다른 기간을 선택하거나, 언어 설정을 변경해보세요.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)} 
          centered
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontSize: '1rem',
              fontWeight: 500,
              py: 2,
            },
          }}
        >
          <Tab label="요약 통계" />
          <Tab label="키워드 분석" />
          <Tab label="트렌드 분석" />
        </Tabs>
      </Box>

      {/* 요약 통계 탭 */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                전체 리뷰
              </Typography>
              <Typography variant="h3" color="primary.main">
                {analyzeResult.summary_stats.total_reviews.toLocaleString()}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
                일평균 {(analyzeResult.summary_stats.total_reviews / analyzeResult.trends.daily.length).toFixed(1)}개
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                리뷰 평가 비율
              </Typography>
              <Box sx={{ 
                height: 300,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Pie
                  data={pieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          font: {
                            size: 14
                          },
                          generateLabels: (chart) => {
                            const datasets = chart.data.datasets;
                            return datasets[0].data.map((value, i) => ({
                              text: `${chart.data.labels[i]}: ${value.toLocaleString()}개 (${(value / analyzeResult.summary_stats.total_reviews * 100).toFixed(1)}%)`,
                              fillStyle: datasets[0].backgroundColor[i],
                              strokeStyle: datasets[0].borderColor[i],
                              lineWidth: 1,
                              hidden: false,
                              index: i
                            }));
                          }
                        }
                      },
                      layout: {
                        padding: {
                          top: 20,
                          bottom: 40  // 범례와의 간격 조정
                        }
                      }
                    }
                  }}
                  style={{ maxWidth: '80%' }}  // 차트 크기 제한
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* GPT 분석 결과 */}
        {analyzeResult.gpt_summary && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              AI 리뷰 분석 결과
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 3 }}>
                  <Typography variant="h6" color="success.main" gutterBottom>
                    긍정 리뷰 종합 분석
                  </Typography>
                  <MarkdownContent>
                    {analyzeResult.gpt_summary.positive_summary}
                  </MarkdownContent>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 3 }}>
                  <Typography variant="h6" color="error.main" gutterBottom>
                    부정 리뷰 종합 분석
                  </Typography>
                  <MarkdownContent>
                    {analyzeResult.gpt_summary.negative_summary}
                  </MarkdownContent>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </TabPanel>

      {/* 키워드 분석 탭 */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="success.main">
                긍정적 키워드
              </Typography>
              <Box sx={{ mb: 4 }}>
                {analyzeResult.wordcloud?.pos_wc_base64 ? (
                  <img
                    src={`data:image/png;base64,${analyzeResult.wordcloud.pos_wc_base64}`}
                    alt="Positive WordCloud"
                    style={{ width: '100%', maxWidth: 400, height: 'auto' }}
                  />
                ) : (
                  <Typography>워드클라우드 이미지가 없습니다.</Typography>
                )}
              </Box>
              <Typography variant="subtitle1" gutterBottom>
                주요 키워드 빈도
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar
                  data={positiveBarData}
                  options={{
                    responsive: true,
                    indexAxis: 'y',
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      x: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="error.main">
                부정적 키워드
              </Typography>
              <Box sx={{ mb: 4 }}>
                {analyzeResult.wordcloud?.neg_wc_base64 ? (
                  <img
                    src={`data:image/png;base64,${analyzeResult.wordcloud.neg_wc_base64}`}
                    alt="Negative WordCloud"
                    style={{ width: '100%', maxWidth: 400, height: 'auto' }}
                  />
                ) : (
                  <Typography>워드클라우드 이미지가 없습니다.</Typography>
                )}
              </Box>
              <Typography variant="subtitle1" gutterBottom>
                주요 키워드 빈도
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar
                  data={negativeBarData}
                  options={{
                    responsive: true,
                    indexAxis: 'y',
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      x: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* 트렌드 분석 탭 */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                일별 리뷰 추이
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ height: 400 }}>
                <Line
                  data={{
                    labels: analyzeResult.trends.daily.map(d => d.date),
                    datasets: [
                      {
                        label: '리뷰 수',
                        data: analyzeResult.trends.daily.map(d => d.review_count),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        fill: true,
                        tension: 0.4
                      }
                    ]
                  }}
                  options={chartOptions}
                />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>월별 긍정/부정 비율</Typography>
              <Line
                data={{
                  labels: analyzeResult.trends.monthly.map(d => d.month),
                  datasets: [
                    {
                      label: '긍정 비율',
                      data: analyzeResult.trends.monthly.map(d => d.positive_ratio),
                      borderColor: 'rgb(75, 192, 192)',
                      tension: 0.1
                    }
                  ]
                }}
              />
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Paper>
  );
} 