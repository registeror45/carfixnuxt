import mongoose from 'mongoose';

const basketSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true, // Обязательное поле для привязки корзины к пользователю
  },
  items: [
    {
      'items-product-name': {
        type: String,
        required: true,
      },
      'items-quantity': {
        type: Number,
        required: true,
        default: 1,
      },
      'items-price': {
        type: Number,
        required: true,
      },
      'items-product-image': {
        type: String,
        required: true,
      },
    },
  ],
});

export default mongoose.model('Basket', basketSchema);