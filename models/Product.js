import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    'product-name': {
        type: String,
        required: true,
    },
    'product-description': {
        type: String,
        required: true,
    },
    'product-price': {
        type: Number,
        required: true,
    },
    'product-image': {
        type: String,
        required: true,
    },
    'product-category': {
        type: String,
        required: true,
    },
});

export default mongoose.model('Product', productSchema);