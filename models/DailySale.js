const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  foodItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  foodName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: true });

const dailySaleSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    index: true
  },
  dateObj: {
    type: Date,
    required: true,
    index: true
  },
  items: [saleItemSchema],
  totalAmount: {
    type: Number,
    default: 0
  },
  totalItemsSold: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Unique constraint: one sale record per date
dailySaleSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('DailySale', dailySaleSchema);
