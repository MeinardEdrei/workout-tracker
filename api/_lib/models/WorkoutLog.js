const mongoose = require('mongoose');

const LogExerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: Number, default: 0 },
  reps: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  weightUnit: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
  category: { type: String, enum: ['warmup', 'workout', 'cooldown'], default: 'workout' },
  notes: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  durationUnit: { type: String, enum: ['sec', 'min'], default: 'sec' },
  isLastWeekWorkout: { type: Boolean, default: false },
  muscleTargets: { type: [String], default: [] },
  setLogs: { type: [{ reps: Number, rir: Number, weight: Number, isDropSet: { type: Boolean, default: false } }], default: [] },
  skipped: { type: Boolean, default: false },
});

const WorkoutLogSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    splitName: { type: String, default: '' },
    dayName: { type: String, default: '' },
    dayTag: { type: String, default: '' },
    exercises: [LogExerciseSchema],
    totalVolume: { type: Number, default: 0 },
    skipped: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkoutLog', WorkoutLogSchema);
