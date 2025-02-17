import { AppBar, Tabs, Tab, Toolbar, Typography } from '@mui/material';

function Navigation({ currentTab, onTabChange }) {
  const handleChange = (event, newValue) => {
    onTabChange(newValue);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          게임 디자인 어시스턴트
        </Typography>
      </Toolbar>
      <Tabs value={currentTab} onChange={handleChange} centered>
        <Tab label="시나리오 관리" value="scenario" />
        <Tab label="리뷰 분석" value="review" />
        <Tab label="디자인 챗봇" value="chatbot" />
        <Tab label="기타" value="other" />
      </Tabs>
    </AppBar>
  );
}

export default Navigation; 