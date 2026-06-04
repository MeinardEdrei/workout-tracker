const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: Number, default: 3 },
  reps: { type: Number, default: 10 },
  untilFailure: { type: Boolean, default: false },
  weight: { type: Number, default: 0 },
  weightUnit: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
  checked: { type: Boolean, default: false },
  lastCheckedDate: { type: String, default: '' },
  order: { type: Number, default: 0 },
  muscleTargets: { type: [String], default: [] },
});

const DaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  tag: { type: String, default: '' },
  isRest: { type: Boolean, default: false },
  exercises: [ExerciseSchema],
  dayOrder: { type: Number, default: 8 },
});

const SplitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    days: [DaySchema],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Split', SplitSchema);
