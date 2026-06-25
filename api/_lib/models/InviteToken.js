const mongoose = require('mongoose');

const InviteTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  usedByEmail: { type: String, default: null },
});

module.exports = mongoose.model('InviteToken', InviteTokenSchema);
