const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const resetAdmin = async () => {
  try {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_sales');
    console.log('Connected to MongoDB');

    let user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      user = new User({ username, password });
      await user.save();
      console.log('Admin user created:', user.username);
    } else {
      user.password = password;
      await user.save();
      console.log('Admin password reset for:', user.username);
    }

    process.exit(0);
  } catch (err) {
    console.error('Admin reset error:', err);
    process.exit(1);
  }
};

resetAdmin();
