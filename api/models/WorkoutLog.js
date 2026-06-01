const mongoose = require('mongoose');

const LogExerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: Number, default: 0 },
  reps: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  weightUnit: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
});

const WorkoutLogSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    splitName: { type: String, default: '' },
    dayName: { type: String, default: '' },
    dayTag: { type: String, default: '' },
    exercises: [LogExerciseSchema],
    totalVolume: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkoutLog', WorkoutLogSchema);
