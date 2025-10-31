import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import { store } from './store';

// Получаем тему из localStorage или используем светлую по умолчанию
const getThemeMode = () => {
  const savedTheme = localStorage.getItem('theme');
  return savedTheme === 'dark' ? 'dark' : 'light';
};

const themeMode = getThemeMode();

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
});

// Применяем тему к document
if (themeMode === 'dark') {
  document.documentElement.classList.add('dark-mode');
} else {
  document.documentElement.classList.remove('dark-mode');
}

const AppWithTheme: React.FC = () => {
  const [mode, setMode] = React.useState<'light' | 'dark'>(themeMode);
  
  // Слушаем изменения темы
  React.useEffect(() => {
    const handleThemeChange = () => {
      const newTheme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
      setMode(newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
    };
    
    // Слушаем изменения в localStorage (если тема меняется в другом компоненте)
    window.addEventListener('storage', handleThemeChange);
    
    // Кастомное событие для синхронного обновления темы
    window.addEventListener('theme-change', handleThemeChange);
    
    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AppWithTheme />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);