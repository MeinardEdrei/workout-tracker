const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: Number, default: 3 },
  reps: { type: Number, default: 10 },
  weight: { type: Number, default: 0 },
  weightUnit: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
  checked: { type: Boolean, default: false },
  lastCheckedDate: { type: String, default: '' },
  order: { type: Number, default: 0 },
});

const DaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  tag: { type: String, default: '' },
  isRest: { type: Boolean, default: false },
  exercises: [ExerciseSchema],
});

const SplitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    days: [DaySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Split', SplitSchema);
