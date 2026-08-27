const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    avatar: { type: String, default: '' },
    lastLoginAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
