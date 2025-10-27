import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

// Валидация для входа в систему
export const validateLogin: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Некорректный формат email адреса'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Пароль должен содержать минимум 8 символов')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Пароль должен содержать заглавные и строчные буквы, а также цифры')
];

// Валидация для регистрации
export const validateRegister: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Некорректный формат email адреса'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Пароль должен содержать минимум 8 символов')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Пароль должен содержать заглавные и строчные буквы, цифры и специальные символы'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Имя должно содержать от 2 до 50 символов')
    .matches(/^[а-яА-ЯёЁa-zA-Z\s]+$/)
    .withMessage('Имя может содержать только буквы и пробелы'),
  
  body('role')
    .optional()
    .isIn(['operator', 'admin', 'viewer'])
    .withMessage('Роль должна быть: operator, admin или viewer')
];

// Обработчик ошибок валидации
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    const appError = AppError.validation(
      'Ошибка валидации данных',
      { validationErrors },
      (req as any).requestId
    );

    return next(appError);
  }
  
  next();
};