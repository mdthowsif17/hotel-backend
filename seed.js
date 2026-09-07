const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const MenuItem = require('./models/MenuItem');
const DailySale = require('./models/DailySale');
require('dotenv').config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_sales');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany();
    await MenuItem.deleteMany();
    await DailySale.deleteMany();
    console.log('Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    const admin = new User({
      username: process.env.ADMIN_USERNAME || 'admin',
      password: adminPassword
    });
    await admin.save();
    console.log('Admin user created:', admin.username);

    // Create sample menu items
    const menuItems = [
      { name: 'Parotta', category: 'Main Food', price: 10, status: 'active' },
      { name: 'Chicken 65', category: 'Chicken', price: 60, status: 'active' },
      { name: 'Egg Omelette', category: 'Egg', price: 30, status: 'active' },
      { name: 'Dosa', category: 'Dosa', price: 40, status: 'active' },
      { name: 'Idli', category: 'Main Food', price: 15, status: 'active' },
      { name: 'Chicken Biryani', category: 'Chicken', price: 120, status: 'active' },
      { name: 'Tea', category: 'Beverages', price: 10, status: 'active' },
      { name: 'Coffee', category: 'Beverages', price: 15, status: 'active' }
    ];

    await MenuItem.insertMany(menuItems);
    console.log('Sample menu items created');

    // Create sample sales for past 7 days
    const sales = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;

      const items = [
        {
          foodItemId: new mongoose.Types.ObjectId(),
          foodName: 'Parotta',
          category: 'Main Food',
          quantity: Math.floor(Math.random() * 100) + 50,
          unitPrice: 10,
          totalAmount: 0
        },
        {
          foodItemId: new mongoose.Types.ObjectId(),
          foodName: 'Chicken 65',
          category: 'Chicken',
          quantity: Math.floor(Math.random() * 20) + 5,
          unitPrice: 60,
          totalAmount: 0
        }
      ];

      items.forEach(item => {
        item.totalAmount = item.quantity * item.unitPrice;
      });

      const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
      const totalItemsSold = items.reduce((sum, item) => sum + item.quantity, 0);

      sales.push({
        date: dateStr,
        dateObj: date,
        items,
        totalAmount,
        totalItemsSold
      });
    }

    await DailySale.insertMany(sales);
    console.log('Sample sales data created');

    console.log('\nSeed completed successfully!');
    console.log('Login with:');
    console.log('Username:', process.env.ADMIN_USERNAME || 'admin');
    console.log('Password:', process.env.ADMIN_PASSWORD || 'admin123');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seed();
