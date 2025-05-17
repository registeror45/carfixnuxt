import express from 'express';
import Category from '../models/Category.js';

const router = express.Router();

// Получить все категории
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении категорий', error });
  }
});

// Добавить новую категорию
router.post('/', async (req, res) => {
  const { 'categories-name': categoryName } = req.body;

  if (!categoryName) {
    return res.status(400).json({ message: 'Название категории обязательно' });
  }

  try {
    const newCategory = new Category({ 'categories-name': categoryName });
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при добавлении категории', error });
  }
});

// Удалить категорию
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }
    res.json({ message: 'Категория успешно удалена', deletedCategory });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении категории', error });
  }
});

export default router;