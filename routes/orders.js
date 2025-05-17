import express from 'express';
import Order from '../models/Order.js';

const router = express.Router();

// Создание нового заказа
router.post('/', async (req, res) => {
  const { userId, items, 'order-name': orderName, 'order-gmail': orderGmail, 'order-phone': orderPhone } = req.body;

  try {
    const newOrder = new Order({
      userId,
      items,
      'order-name': orderName,
      'order-gmail': orderGmail,
      'order-phone': orderPhone,
    });

    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при создании заказа', error });
  }
});

// Получение всех заказов
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ orderNumber: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении заказов', error });
  }
});

// Обновление заказа (статус, товары)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { 'order-status': orderStatus, items } = req.body;

  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { 'order-status': orderStatus, items },
      { new: true }
    );
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении заказа', error });
  }
});

// Удаление заказа
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await Order.findByIdAndDelete(id);
    res.json({ message: 'Заказ успешно удален' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении заказа', error });
  }
});

export default router;