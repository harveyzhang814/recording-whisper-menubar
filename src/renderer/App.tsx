import React from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { MainLayout } from './components/MainLayout';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <MainLayout />
    </ThemeProvider>
  );
};

export default App; 