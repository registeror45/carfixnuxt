// models/Admin.js
import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    'admin-login': { type: String, required: true },
    'admin-pass': { type: String, required: true },
    'admin-role': { type: String, required: true },
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;