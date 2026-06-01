const mongoose = require('mongoose');

const AllowedEmailSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  addedAt: { type: Date, default: Date.now },
  addedBy: { type: String, default: '' },
  note: { type: String, default: '' },
});

module.exports = mongoose.model('AllowedEmail', AllowedEmailSchema);
