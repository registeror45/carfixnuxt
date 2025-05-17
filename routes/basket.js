import express from 'express';
import Basket from '../models/Basket.js';

const router = express.Router();

// Добавить товар в корзину
router.post('/add', async (req, res) => {
    const { userId, 'items-product-name': productName, 'items-quantity': quantity, 'items-price': price, 'items-product-image': image } = req.body;

    try {
        let basket = await Basket.findOne({ userId });

        if (!basket) {
            basket = new Basket({ userId, items: [] });
        }

        const productIndex = basket.items.findIndex(item => item['items-product-name'] === productName);

        if (productIndex > -1) {
            basket.items[productIndex]['items-quantity'] += quantity;
        } else {
            basket.items.push({
                'items-product-name': productName,
                'items-quantity': quantity,
                'items-price': price,  // Теперь price будет числом
                'items-product-image': image,
            });
        }

        await basket.save();
        res.status(201).json(basket);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при добавлении товара в корзину', error });
    }
});

// Удалить товар из корзины
router.delete('/remove', async (req, res) => {
    const { userId, 'items-product-name': productName } = req.body;

    try {
        const basket = await Basket.findOne({ userId });

        if (!basket) {
            return res.status(404).json({ message: 'Корзина не найдена' });
        }

        basket.items = basket.items.filter(item => item['items-product-name'] !== productName);
        await basket.save();
        res.json(basket);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении товара из корзины', error });
    }
});

// Изменить количество товара в корзине
router.put('/update', async (req, res) => {
    const { userId, 'items-product-name': productName, 'items-quantity': quantity } = req.body;

    try {
        const basket = await Basket.findOne({ userId });

        if (!basket) {
            return res.status(404).json({ message: 'Корзина не найдена' });
        }

        const productIndex = basket.items.findIndex(item => item['items-product-name'] === productName);

        if (productIndex > -1) {
            basket.items[productIndex]['items-quantity'] = quantity;
        }

        await basket.save();
        res.json(basket);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении количества товара', error });
    }
});

// Получить корзину пользователя
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const basket = await Basket.findOne({ userId });
        res.json(basket);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении корзины', error });
    }
});

// Очистка корзины пользователя
router.delete('/:userId', async (req, res) => {
    const { userId } = req.params;
  
    try {
      const basket = await Basket.findOne({ userId });
  
      if (!basket) {
        return res.status(404).json({ message: 'Корзина не найдена' });
      }
  
      basket.items = []; // Очищаем корзину
      await basket.save();
  
      res.json({ message: 'Корзина успешно очищена' });
    } catch (error) {
      res.status(500).json({ message: 'Ошибка при очистке корзины', error });
    }
});

export default router;