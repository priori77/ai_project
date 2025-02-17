import { useState } from 'react';
import { Box, Container } from '@mui/material';
import Navigation from './Navigation';
import ScenarioTab from './ScenarioTab';
import ReviewTab from './ReviewTab';
import ChatbotTab from './ChatbotTab';
import OtherTab from './OtherTab';

function Layout() {
  const [currentTab, setCurrentTab] = useState('scenario');
  const [reviewState, setReviewState] = useState({
    searchResults: [],
    selectedGame: null,
    reviews: [],
    analysisResult: null,
    loading: false,
    error: null
  });

  const renderContent = () => {
    switch (currentTab) {
      case 'scenario':
        return <ScenarioTab />;
      case 'review':
        return <ReviewTab 
          reviewState={reviewState}
          setReviewState={setReviewState}
        />;
      case 'chatbot':
        return <ChatbotTab />;
      case 'other':
        return <OtherTab />;
      default:
        return <ScenarioTab />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navigation currentTab={currentTab} onTabChange={setCurrentTab} />
      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        {renderContent()}
      </Container>
    </Box>
  );
}

export default Layout; 