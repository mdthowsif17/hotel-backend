const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const auth = require('../middleware/auth');

// @route   GET /api/menu
// @desc    Get all menu items
router.get('/', auth, async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {};

    if (status) query.status = status;
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const items = await MenuItem.find(query).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/menu
// @desc    Add new menu item
router.post('/', auth, async (req, res) => {
  try {
    const { name, category, price, status } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ message: 'Name, category and price are required' });
    }

    if (price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    // Check for duplicate active name
    const existing = await MenuItem.findOne({ 
      name: { $regex: new RegExp('^' + name + '$', 'i') },
      status: 'active'
    });

    if (existing) {
      return res.status(400).json({ message: 'Food item with this name already exists' });
    }

    const item = new MenuItem({ name, category, price, status: status || 'active' });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Food item already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/menu/:id
// @desc    Update menu item
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, category, price, status } = req.body;

    if (price !== undefined && price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { name, category, price, status },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json(item);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Food item with this name already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/menu/:id
// @desc    Delete menu item
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
