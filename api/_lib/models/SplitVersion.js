const mongoose = require('mongoose');

const SplitVersionSchema = new mongoose.Schema(
  {
    splitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Split', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    days: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SplitVersion', SplitVersionSchema);
