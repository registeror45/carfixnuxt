// models/Order.js
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: Number,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
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
  'order-name': {
    type: String,
    required: true,
  },
  'order-gmail': {
    type: String,
    required: true,
  },
  'order-phone': {
    type: String,
    required: true,
  },
  'order-status': {
    type: String,
    default: 'Не готов',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware для автоматического увеличения orderNumber
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastOrder = await this.constructor.findOne().sort({ orderNumber: -1 });
    this.orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;
  }
  next();
});

export default mongoose.model('Order', orderSchema);