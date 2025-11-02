import express from 'express'
import { authenticateToken, requireRole } from '../middleware/authMiddleware'
import { taskQueueService } from '../services/TaskQueueService'
import { getTransportMode, setTransportMode } from '../services/TransportMode'
import { robotService } from '../sockets/websocket'
import { adminService } from '../services/AdminService'

const router = express.Router()

// Управление товарными лимитами
router.get('/products/limits', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await adminService.getProductLimits();
    res.json({ 
      success: true, 
      products: result.products,
      thresholds: result.thresholds
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/products/:id/limits', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { min_stock, optimal_stock } = req.body;
    
    await adminService.updateProductLimits(id, min_stock, optimal_stock);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/products/thresholds', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { critical, low_stock, warning } = req.body;
    
    await adminService.updateThresholds({ critical, low_stock, warning });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Управление роботами
router.get('/robots', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const robots = await adminService.getRobots();
    res.json({ success: true, robots });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/robots', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id, name, zone } = req.body;
    await adminService.createRobot(id, name, zone);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/robots/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await adminService.deleteRobot(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/robots/:id/charge', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    // Отправляем команду на зарядку через WebSocket
    if (robotService.io) {
      robotService.io.emit('robot:command', {
        robotId: id,
        command: 'charge',
        force: true,
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/robots/:id/maintenance', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;
    await adminService.scheduleMaintenance(id, date);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Управление пользователями
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const users = await adminService.getUsers();
    res.json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await adminService.createUser({ name, email, password, role });
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/users/:id/role', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    await adminService.updateUserRole(Number(id), role);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/users/:id/block', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body;
    await adminService.toggleUserBlock(Number(id), blocked);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Получить системные логи администратора
 *     description: Возвращает логи системы управления роботами и задачами. Доступно только для администраторов.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Логи успешно получены
 */
router.get('/logs', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Temporary fix until getLogs method is implemented
    const logs = []; // taskQueueService.getLogs();
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/transport-mode:
 *   get:
 *     summary: Получить режим транспорта
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/transport-mode', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const mode = getTransportMode();
    res.json({ success: true, mode });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/transport-mode:
 *   post:
 *     summary: Установить режим транспорта
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post('/transport-mode', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { mode } = req.body;
    setTransportMode(mode);
    res.json({ success: true, mode });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;