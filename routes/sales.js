const express = require('express');
const router = express.Router();
const DailySale = require('../models/DailySale');
const MenuItem = require('../models/MenuItem');
const auth = require('../middleware/auth');

// Helper to format date as DD-MM-YYYY
const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// @route   GET /api/sales
// @desc    Get all sales (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.dateObj = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sales = await DailySale.find(query)
      .sort({ dateObj: -1 })
      .limit(parseInt(limit));

    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/sales/:date
// @desc    Get sales for specific date (DD-MM-YYYY)
router.get('/:date', auth, async (req, res) => {
  try {
    const sale = await DailySale.findOne({ date: req.params.date });
    if (!sale) {
      return res.status(404).json({ message: 'No sales found for this date' });
    }
    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/sales
// @desc    Create or update daily sales
router.post('/', auth, async (req, res) => {
  try {
    const { date, items } = req.body;

    if (!date || !items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Date and items are required' });
    }

    // Validate items and calculate totals
    let totalAmount = 0;
    let totalItemsSold = 0;
    const processedItems = [];

    for (const item of items) {
      if (!item.foodItemId || !item.foodName || item.quantity === undefined || item.unitPrice === undefined) {
        return res.status(400).json({ message: 'Invalid item data' });
      }

      if (item.quantity < 0) {
        return res.status(400).json({ message: 'Quantity cannot be negative' });
      }

      const total = item.quantity * item.unitPrice;
      processedItems.push({
        foodItemId: item.foodItemId,
        foodName: item.foodName,
        category: item.category || 'Uncategorized',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: total
      });

      totalAmount += total;
      totalItemsSold += item.quantity;
    }

    const [day, month, year] = date.split('-');
    const dateObj = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

    // Upsert: update if exists, create if not
    const sale = await DailySale.findOneAndUpdate(
      { date },
      {
        date,
        dateObj,
        items: processedItems,
        totalAmount,
        totalItemsSold
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(sale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/sales/:date
// @desc    Update specific daily sale
router.put('/:date', auth, async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Items are required' });
    }

    let totalAmount = 0;
    let totalItemsSold = 0;
    const processedItems = [];

    for (const item of items) {
      const total = item.quantity * item.unitPrice;
      processedItems.push({
        ...item,
        totalAmount: total
      });
      totalAmount += total;
      totalItemsSold += item.quantity;
    }

    const sale = await DailySale.findOneAndUpdate(
      { date: req.params.date },
      { items: processedItems, totalAmount, totalItemsSold },
      { new: true }
    );

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/sales/:date
// @desc    Delete daily sale
router.delete('/:date', auth, async (req, res) => {
  try {
    const sale = await DailySale.findOneAndDelete({ date: req.params.date });
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    res.json({ message: 'Daily sale deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/sales/stats/summary
// @desc    Get sales summary stats
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 86400000));

    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todaySale, yesterdaySale, weekSales, monthSales] = await Promise.all([
      DailySale.findOne({ date: today }),
      DailySale.findOne({ date: yesterday }),
      DailySale.find({ dateObj: { $gte: weekStart } }),
      DailySale.find({ dateObj: { $gte: monthStart } })
    ]);

    const weekTotal = weekSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const monthTotal = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);

    res.json({
      today: todaySale?.totalAmount || 0,
      yesterday: yesterdaySale?.totalAmount || 0,
      thisWeek: weekTotal,
      thisMonth: monthTotal
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/sales/stats/food-wise
// @desc    Get food-wise sales
router.get('/stats/food-wise', auth, async (req, res) => {
  try {
    const sales = await DailySale.find();
    const foodMap = {};

    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!foodMap[item.foodName]) {
          foodMap[item.foodName] = {
            foodName: item.foodName,
            category: item.category,
            totalQuantity: 0,
            totalRevenue: 0
          };
        }
        foodMap[item.foodName].totalQuantity += item.quantity;
        foodMap[item.foodName].totalRevenue += item.totalAmount;
      });
    });

    const result = Object.values(foodMap).sort((a, b) => b.totalQuantity - a.totalQuantity);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
