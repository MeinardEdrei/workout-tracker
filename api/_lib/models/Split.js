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
  imageUrl: { type: String, default: '' },
  imageSource: { type: String, enum: ['auto', 'custom', ''], default: '' },
  placeholderUsed: { type: Boolean, default: false },
  category: { type: String, enum: ['warmup', 'workout', 'cooldown'], default: 'workout' },
  notes: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  durationUnit: { type: String, enum: ['sec', 'min'], default: 'sec' },
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
    isPublic: { type: Boolean, default: false },
    sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Split', default: null },
    duplicatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Split', default: null },
    days: [DaySchema],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Split', SplitSchema);
