import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import authMiddleware from '../middleware/authMiddleware.js'; // Импортируем authMiddleware

const router = express.Router();

// Маршрут для входа в систему
router.post('/login', async (req, res) => {
  const { login, password } = req.body;

  try {
    const admin = await Admin.findOne({ 'admin-login': login, 'admin-pass': password });

    if (!admin) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    // Генерация токена
    const token = jwt.sign(
      { id: admin._id, role: admin['admin-role'] },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Установка токена в HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Используйте secure в production
      path: '/', // Убедитесь, что путь совпадает с путем удаления куки
      sameSite: 'strict', // Защита от CSRF
      maxAge: 3600000, // Время жизни куки в миллисекундах (например, 1 час)
    });

    res.json({ success: true, role: admin['admin-role'] });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Маршрут для проверки авторизации
router.get('/check-auth', authMiddleware, (req, res) => {
  res.json({ success: true, role: req.user.role });
});

// Маршрут для обновления токена
router.post('/refresh-token', (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Токен отсутствует' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const newToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Устанавливаем новый токен в cookies
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'strict',
    });

    res.json({ success: true });
  } catch (error) {
    return res.status(401).json({ message: 'Недействительный токен' });
  }
});

// Выход с авторизации.
router.post('/logout', (req, res) => {
  // Очищаем куки с токеном
  res.clearCookie('token', {
    path: '/', // Убедитесь, что путь совпадает с путем установки куки
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Используйте secure в production
    sameSite: 'strict',
  });
  res.json({ success: true, message: 'Вы успешно вышли из системы' });
});

export default router;