import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ApiConfigProvider } from './context/ApiConfigContext';
import { LogProvider } from './context/LogContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <ApiConfigProvider>
            <LogProvider>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </LogProvider>
          </ApiConfigProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
