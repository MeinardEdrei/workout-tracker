require('dotenv').config();
const mongoose = require('mongoose');
const Split = require('./models/Split');

const seed = [
  {
    name: 'PPL',
    isActive: false,
    days: [
      {
        name: 'Push Day',
        tag: 'Chest · Shoulders · Triceps',
        isRest: false,
        exercises: [
          { name: 'Incline DB Press', sets: 3, reps: 10, weight: 30, weightUnit: 'lbs' },
          { name: 'Machine Chest Press', sets: 3, reps: 8, weight: 30, weightUnit: 'kg' },
          { name: 'Machine Shoulder Press', sets: 3, reps: 8, weight: 30, weightUnit: 'kg' },
          { name: 'Lateral Raise', sets: 3, reps: 12, weight: 7.5, weightUnit: 'kg' },
          { name: 'Pec Fly', sets: 3, reps: 12, weight: 0, weightUnit: 'kg' },
          { name: 'Tricep Pushdown', sets: 3, reps: 12, weight: 20, weightUnit: 'kg' },
          { name: 'Overhead Tricep Extension', sets: 3, reps: 12, weight: 15, weightUnit: 'kg' },
        ],
      },
      {
        name: 'Pull Day',
        tag: 'Back · Biceps',
        isRest: false,
        exercises: [
          { name: 'Pull Ups (assisted)', sets: 3, reps: 0, weight: 0, weightUnit: 'kg' },
          { name: 'Lat Pulldown', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Seated Cable Row', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Face Pull', sets: 3, reps: 15, weight: 15, weightUnit: 'kg' },
          { name: 'Preacher Curl / DB Curl', sets: 3, reps: 10, weight: 7.5, weightUnit: 'kg' },
          { name: 'Hammer Curl', sets: 3, reps: 10, weight: 7.5, weightUnit: 'kg' },
        ],
      },
      {
        name: 'Legs Day',
        tag: 'Quads · Hamstrings · Calves',
        isRest: false,
        exercises: [
          { name: 'Goblet Squat', sets: 3, reps: 10, weight: 20, weightUnit: 'kg' },
          { name: 'Romanian Deadlift Dumbbell', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Leg Press (quads focused)', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Leg Curl Machine', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Calf Raise Machine', sets: 3, reps: 15, weight: 30, weightUnit: 'kg' },
        ],
      },
    ],
  },
  {
    name: 'Upper Lower',
    isActive: true,
    days: [
      {
        name: 'Monday',
        tag: 'Upper A · Chest + Back',
        isRest: false,
        exercises: [
          { name: 'Incline DB Press', sets: 3, reps: 10, weight: 30, weightUnit: 'lbs' },
          { name: 'Lat Pulldown', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Machine Chest Press', sets: 3, reps: 8, weight: 30, weightUnit: 'kg' },
          { name: 'Seated Cable Row', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Pec Fly', sets: 3, reps: 12, weight: 0, weightUnit: 'kg' },
          { name: 'Face Pull', sets: 3, reps: 15, weight: 15, weightUnit: 'kg' },
          { name: 'Tricep Pushdown', sets: 3, reps: 12, weight: 20, weightUnit: 'kg' },
          { name: 'DB Curl', sets: 3, reps: 10, weight: 7.5, weightUnit: 'kg' },
        ],
      },
      {
        name: 'Tuesday',
        tag: 'Lower A · Legs + Core',
        isRest: false,
        exercises: [
          { name: 'Goblet Squat', sets: 3, reps: 10, weight: 20, weightUnit: 'kg' },
          { name: 'Romanian Deadlift Dumbbell', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Leg Press (quads focused)', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Leg Curl Machine', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Calf Raise Machine', sets: 3, reps: 15, weight: 30, weightUnit: 'kg' },
          { name: 'Plank', sets: 3, reps: 30, weight: 0, weightUnit: 'kg' },
        ],
      },
      {
        name: 'Wednesday',
        tag: '',
        isRest: true,
        exercises: [],
      },
      {
        name: 'Thursday',
        tag: 'Upper B · Shoulders + Back',
        isRest: false,
        exercises: [
          { name: 'Machine Shoulder Press', sets: 3, reps: 8, weight: 30, weightUnit: 'kg' },
          { name: 'Pull Ups (assisted)', sets: 3, reps: 0, weight: 0, weightUnit: 'kg' },
          { name: 'Lateral Raise', sets: 3, reps: 12, weight: 7.5, weightUnit: 'kg' },
          { name: 'Seated Cable Row', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Overhead Tricep Extension', sets: 3, reps: 12, weight: 15, weightUnit: 'kg' },
          { name: 'Face Pull', sets: 3, reps: 15, weight: 15, weightUnit: 'kg' },
          { name: 'Hammer Curl', sets: 3, reps: 10, weight: 7.5, weightUnit: 'kg' },
          { name: 'Preacher Curl', sets: 3, reps: 10, weight: 7.5, weightUnit: 'kg' },
        ],
      },
      {
        name: 'Friday',
        tag: 'Lower B · Legs + Core',
        isRest: false,
        exercises: [
          { name: 'Goblet Squat', sets: 3, reps: 10, weight: 20, weightUnit: 'kg' },
          { name: 'Romanian Deadlift Dumbbell', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Leg Press (hamstring focused)', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Leg Curl Machine', sets: 3, reps: 10, weight: 30, weightUnit: 'kg' },
          { name: 'Calf Raise Machine', sets: 3, reps: 15, weight: 30, weightUnit: 'kg' },
          { name: 'Dead Bug', sets: 3, reps: 10, weight: 0, weightUnit: 'kg' },
        ],
      },
      {
        name: 'Saturday',
        tag: '',
        isRest: true,
        exercises: [],
      },
      {
        name: 'Sunday',
        tag: '',
        isRest: true,
        exercises: [],
      },
    ],
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  const existing = await Split.countDocuments();
  if (existing > 0) {
    console.log(`Seed aborted — ${existing} split(s) already exist. Delete them manually first if you really want to reseed.`);
    await mongoose.disconnect();
    return;
  }
  await Split.insertMany(seed);
  console.log('Seed data inserted ✓');
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
