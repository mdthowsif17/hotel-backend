const express = require('express');
const router = express.Router();
const DailySale = require('../models/DailySale');
const auth = require('../middleware/auth');

// @route   GET /api/reports/daily/:date
// @desc    Get daily report data
router.get('/daily/:date', auth, async (req, res) => {
  try {
    const sale = await DailySale.findOne({ date: req.params.date });
    if (!sale) {
      return res.status(404).json({ message: 'No report found for this date' });
    }
    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/range
// @desc    Get reports for date range
router.get('/range', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates required' });
    }

    const sales = await DailySale.find({
      dateObj: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ dateObj: 1 });

    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/chart-data
// @desc    Get data for sales chart
router.get('/chart-data', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const sales = await DailySale.find({
      dateObj: { $gte: startDate, $lte: endDate }
    }).sort({ dateObj: 1 }).select('date totalAmount');

    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
