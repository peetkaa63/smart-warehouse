import React, { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import {
  Paper,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
  Box,
  Alert,
  CircularProgress,
  useTheme,
  InputAdornment,
  IconButton,
} from "@mui/material"
import { Login as LoginIcon, Visibility, VisibilityOff } from "@mui/icons-material"
import { motion, AnimatePresence } from "framer-motion"
import { login, clearError } from '../store/slices/authSlice'
import { RootState, AppDispatch } from '../store'

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading, error } = useSelector((state: RootState) => state.auth)

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })

  const [animationStage, setAnimationStage] = useState<"initial" | "logoMove" | "form" | "success" | "error">("initial")
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Обычный вход - последовательная анимация
  useEffect(() => {
    const timer1 = setTimeout(() => {
      setAnimationStage("logoMove") // Лого начинает движение вверх
    }, 1200) // Bounce анимация закончилась
    
    const timer2 = setTimeout(() => {
      setAnimationStage("form") // Показываем форму после движения лого
    }, 1800) // 1200 + 600ms движение
    
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  // Обработка ошибок из Redux - только когда не сабмитим
  useEffect(() => {
    // Игнорируем ошибки из Redux если уже обрабатываем локально
    if (error && !isSubmitting && !localError) {
      setLocalError(error)
      setAnimationStage("error")
      setIsSubmitting(false)
      // Очищаем ошибку в Redux после обработки
      setTimeout(() => {
        dispatch(clearError())
      }, 100)
    }
  }, [error, isSubmitting, dispatch, localError])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    // Очистить ошибку при изменении поля
    if (localError) {
      setLocalError(null)
      if (animationStage === "error") {
        setAnimationStage("form")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsSubmitting(true)
    setLocalError(null)

    // Базовая валидация на фронтенде
    if (!formData.email || !formData.password) {
      setLocalError("Заполните все поля")
      setAnimationStage("error")
      setIsSubmitting(false)
      return
    }

    if (formData.password.length < 8) {
      setLocalError("Пароль должен содержать минимум 8 символов")
      setAnimationStage("error")
      setIsSubmitting(false)
      return
    }

    try {
      // Начинаем анимацию успешного входа
      setAnimationStage("success")
      
      // Ждем немного перед началом обратной анимации
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const result = await dispatch(login(formData)).unwrap()
      
      // Если успешный вход - завершаем анимацию и переходим
      if (result) {
        // Даем время для завершения анимаций перед переходом
        setTimeout(() => {
          navigate('/dashboard', { state: { fromLogin: true } })
        }, 1200)
      }
    } catch (error: any) {
      // При ошибке возвращаемся к форме без обратной анимации
      // НЕ перезагружаем страницу!
      console.log('🔐 Login error caught, setting local error:', error)
      setAnimationStage("error")
      setIsSubmitting(false)
      
      // Показываем ошибку из перехваченной ошибки или из Redux
      // Приоритет: error.payload (из Redux rejectWithValue) > error.message
      const errorMessage = error?.payload || error?.message || 'Неверный логин или пароль'
      setLocalError(errorMessage)
      
      // Очищаем ошибку в Redux сразу, чтобы избежать дублирования
      dispatch(clearError())
    }
  }

  const shouldShowLogo = () => {
    return animationStage === "initial" || 
           animationStage === "logoMove" || 
           animationStage === "form" || 
           animationStage === "error" || 
           animationStage === "success"
  }

  const showForm = animationStage === "form" || animationStage === "error"
  const showError = animationStage === "error" && localError
  const theme = useTheme()

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.default : '#f5f5f5',
        position: "relative",
        overflow: "hidden",
        transition: 'background-color 0.3s ease',
      }}
    >
      {/* Логотип */}
      <AnimatePresence>
        {shouldShowLogo() && (
          <motion.div
            key="logo"
            initial={{ scale: 0, opacity: 0, y: 0 }}
            animate={
              animationStage === "initial" ? 
                { scale: [0, 1.2, 1], opacity: 1, y: 0 } :
              animationStage === "logoMove" ? 
                { scale: 1, opacity: 1, y: -300 } :
              animationStage === "form" || animationStage === "error" ? 
                { scale: 1, opacity: 1, y: -300 } : // При ошибке лого остается наверху
              animationStage === "success" ? 
                { scale: 0, opacity: 0, y: 0 } : // Лого исчезает только при успехе
                { scale: 1, opacity: 1, y: 0 }
            }
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              duration: animationStage === "initial" ? 0.8 : 
                       animationStage === "success" ? 0.8 : 0.6,
              scale: animationStage === "initial" ? {
                type: "spring",
                damping: 10,
                stiffness: 100,
              } : { type: "tween", ease: "easeOut" },
              y: { 
                type: "tween", 
                ease: "easeOut", 
                duration: (animationStage === "logoMove" || animationStage === "success") ? 0.6 : 0,
                delay: animationStage === "success" ? 0.3 : 0 // Лого двигается вниз после исчезновения формы
              }
            }}
            style={{
              position: "absolute",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
            }}
          >
            <img 
              src={theme.palette.mode === 'dark' ? "/logo_white.png" : "/logo.png"} 
              alt="Ростелеком" 
              style={{ width: 200 }} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Форма */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ 
              opacity: 0, 
              scale: 0.95,
              transition: { 
                duration: 0.4,
                ease: "easeIn"
              }
            }}
            transition={{ 
              duration: 0.5,
              delay: animationStage === "form" ? 0.5 : 0 // Форма появляется под конец движения лого
            }}
            style={{
              position: "absolute",
              transform: "translate(-50%, -50%)",
              width: "100%",
              maxWidth: 444,
              padding: "0 16px",
              zIndex: 5,
            }}
          >
            <Paper elevation={3} sx={{ padding: 4, width: "100%" }}>
              <Typography component="h1" variant="h5" align="center" gutterBottom>
                Умный склад
              </Typography>
              <Typography component="h2" variant="h6" align="center" color="textSecondary" gutterBottom>
                Вход в систему
              </Typography>

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                <AnimatePresence>
                  {showError && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {localError}
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email адрес"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={formData.email}
                  onChange={handleChange}
                  error={!!localError}
                />

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Пароль"
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  error={!!localError}
                  helperText="Пароль должен содержать минимум 8 символов"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                          sx={{
                            position: 'relative',
                            width: 40,
                            height: 40
                          }}
                        >
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={showPassword ? 'off' : 'on'}
                              initial={{ scale: 0, rotate: -180, opacity: 0 }}
                              animate={{ scale: 1, rotate: 0, opacity: 1 }}
                              exit={{ scale: 0, rotate: 180, opacity: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              style={{
                                position: 'absolute',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </motion.div>
                          </AnimatePresence>
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <FormControlLabel
                  control={
                    <Checkbox name="rememberMe" color="primary" checked={formData.rememberMe} onChange={handleChange} />
                  }
                  label="Запомнить меня"
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading || isSubmitting}
                  startIcon={loading || isSubmitting ? <CircularProgress size={20} /> : <LoginIcon />}
                >
                  {(loading || isSubmitting) ? "Вход..." : "Войти"}
                </Button>
              </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  )
}

export default Login