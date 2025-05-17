import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Получить все товары
router.get('/', async (req, res) => {
    try {
      const products = await Product.find();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Ошибка при получении товаров', error });
    }
});

// Маршрут для поиска товаров по названию
router.get('/search/:query', async (req, res) => {
    const { query } = req.params;
  
    try {
      const products = await Product.find({
        'product-name': { $regex: query, $options: 'i' },
      });
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Ошибка при поиске товаров', error });
    }
});

// Получить товары по категории
router.get('/category/:categoryId', async (req, res) => {
    const { categoryId } = req.params;
  
    try {
      const products = await Product.find({ 'product-category': categoryId });
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Ошибка при получении товаров по категории', error });
    }
});

// Добавить новый товар
router.post('/', async (req, res) => {
    const { 'product-name': productName, 'product-description': productDescription, 'product-price': productPrice, 'product-image': productImage, 'product-category': productCategory } = req.body;

    if (!productName || !productDescription || !productPrice || !productImage || !productCategory) {
        return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
    }

    try {
        const newProduct = new Product({
            'product-name': productName,
            'product-description': productDescription,
            'product-price': productPrice,  // Теперь productPrice будет числом
            'product-image': productImage,
            'product-category': productCategory,
        });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Ошибка на сервере:', error);
        res.status(500).json({ message: 'Ошибка при добавлении товара', error });
    }
});

// Получить товар по ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Товар не найден' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении товара', error });
    }
});

// Обновить товар по ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { 'product-name': productName, 'product-description': productDescription, 'product-price': productPrice, 'product-image': productImage, 'product-category': productCategory } = req.body;

    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            {
                'product-name': productName,
                'product-description': productDescription,
                'product-price': productPrice,  // Теперь productPrice будет числом
                'product-image': productImage,
                'product-category': productCategory,
            },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Товар не найден' });
        }

        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении товара', error });
    }
});

// Удалить товар по ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Товар не найден' });
        }
        res.json({ message: 'Товар успешно удален', deletedProduct });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении товара', error });
    }
});

export default router;