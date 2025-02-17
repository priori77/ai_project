import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Paper,
  FormControlLabel,
  Switch,
} from '@mui/material';

export default function ReviewSettings({ settings, onSettingsChange }) {
  const useGpt = settings.use_gpt;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>리뷰 수집 설정</Typography>
      <Box sx={{ 
        display: 'flex', 
        gap: 3, 
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        '& .MuiFormControl-root': { minWidth: 200, flex: 1 }
      }}>
        {/* 리뷰 언어 선택 */}
        <FormControl size="small">
          <InputLabel>리뷰 언어</InputLabel>
          <Select
            value={settings.language}
            label="리뷰 언어"
            onChange={(e) => onSettingsChange('language', e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="koreana">한국어</MenuItem>
            <MenuItem value="english">영어</MenuItem>
          </Select>
        </FormControl>

        {/* 리뷰 타입 선택 */}
        <FormControl size="small">
          <InputLabel>리뷰 타입</InputLabel>
          <Select
            value={settings.review_type}
            label="리뷰 타입"
            onChange={(e) => onSettingsChange('review_type', e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="positive">긍정적</MenuItem>
            <MenuItem value="negative">부정적</MenuItem>
          </Select>
        </FormControl>

        {/* 수집 기간 설정 */}
        <FormControl size="small">
          <TextField
            type="number"
            label="수집 기간 (일)"
            value={settings.day_range}
            onChange={(e) => {
              const value = Math.min(Math.max(1, e.target.value), 365);
              onSettingsChange('day_range', value);
            }}
            inputProps={{ min: 1, max: 365 }}
            helperText="1-365일 범위 입력"
            size="small"
          />
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={useGpt}
              onChange={(e) => onSettingsChange('use_gpt', e.target.checked)}
            />
          }
          label={
            <Box>
              <Typography variant="subtitle1">
                AI 리뷰 분석
              </Typography>
              <Typography variant="body2" color="text.secondary">
                GPT를 사용하여 리뷰를 심층 분석합니다
              </Typography>
            </Box>
          }
        />
      </Box>
    </Paper>
  );
} 