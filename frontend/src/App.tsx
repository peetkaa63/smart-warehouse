import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import Login from './pages/Login';
import Main from './pages/Main';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
// import NotificationSystem from './components/NotificationSystem'; 

const AppRoutes: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Дополнительная обработка ошибок
        console.error('🚨 App-level error:', error, errorInfo);
      }}
    >
      <Routes>
        <Route
          path="/login"
          element={
            <ErrorBoundary>
              <Login />
            </ErrorBoundary>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Main />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Main />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      {/* Система уведомлений */}
      // <NotificationSystem />  // Система уведомлений, показывает быстрое всплывающее окно
    </ErrorBoundary>
  );
};

export default AppRoutes;
