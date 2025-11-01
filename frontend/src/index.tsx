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
  // Анимация для перехода темы
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
  // Глобальные стили для анимации
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
        },
        '*::-webkit-scrollbar': {
          width: '12px',
          height: '12px',
        },
        '*::-webkit-scrollbar-track': {
          background: '#f1f1f1',
        },
        '*::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '6px',
          '&:hover': {
            background: '#555',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.3s ease',
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2', // Голубой как в светлой теме
    },
    secondary: {
      main: '#dc004e', // Как в светлой теме
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  // Анимация для перехода темы
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
  // Глобальные стили для анимации
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
        },
        '*::-webkit-scrollbar': {
          width: '12px',
          height: '12px',
        },
        '*::-webkit-scrollbar-track': {
          background: '#2e2e2e',
        },
        '*::-webkit-scrollbar-thumb': {
          background: '#555',
          borderRadius: '6px',
          '&:hover': {
            background: '#777',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1976d2 !important', // Голубой AppBar
          transition: 'background-color 0.3s ease',
        },
      },
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
  
  // Слушаем изменения темы для анимированного переключения
  React.useEffect(() => {
    const handleThemeChange = () => {
      const newTheme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
      // Анимированное изменение темы (без перезагрузки)
      if (newTheme !== mode) {
        setMode(newTheme);
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark-mode');
        } else {
          document.documentElement.classList.remove('dark-mode');
        }
      }
    };
    
    // Слушаем изменения в localStorage (если тема меняется в другом компоненте)
    window.addEventListener('storage', handleThemeChange);
    
    // Кастомное событие для синхронного обновления темы (анимированно)
    window.addEventListener('theme-change', handleThemeChange);
    
    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, [mode]);

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