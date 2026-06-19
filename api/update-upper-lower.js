require('dotenv').config();
const mongoose = require('mongoose');
const Split = require('./models/Split');

const USER_ID = '6a1d2296efac62eb6f188f2d';

const days = [
  {
    name: 'Sunday', tag: '', isRest: true, dayOrder: 0, exercises: [],
  },
  {
    name: 'Monday', tag: 'Upper A · Chest + Back', isRest: false, dayOrder: 1,
    exercises: [
      { name: 'Lat Pulldown',                  sets: 3, reps: 10, weight: 0, weightUnit: 'kg', muscleTargets: ['Lats'],        order: 0 },
      { name: 'Seated Cable Row',               sets: 3, reps: 10, weight: 0, weightUnit: 'kg', muscleTargets: ['Upper Back'],  order: 1 },
      { name: 'Incline Dumbbell Press',         sets: 3, reps: 10, weight: 0, weightUnit: 'lbs', muscleTargets: ['Upper Chest'], order: 2 },
      { name: 'Butterfly',                      sets: 3, reps: 10, weight: 0, weightUnit: 'kg', muscleTargets: ['Chest'],       order: 3 },
      { name: 'Shoulder Press',                 sets: 3, reps: 10, weight: 0, weightUnit: 'kg', muscleTargets: ['Front Delts'], order: 4 },
      { name: 'Single Arm Rear Delt Cable Fly', sets: 3, reps: 12, weight: 0, weightUnit: 'kg', muscleTargets: ['Rear Delts'],  order: 5 },
      { name: 'Lateral Raise',                  sets: 3, reps: 12, weight: 0, weightUnit: 'kg', muscleTargets: ['Side Delts'],  order: 6 },
      { name: 'Incline Dumbbell Curl',          sets: 3, reps: 10, weight: 0, weightUnit: 'kg', muscleTargets: ['Biceps'],      order: 7 },
      { name: 'Tricep Pushdown',                sets: 3, reps: 12, weight: 0, weightUnit: 'kg', muscleTargets: ['Triceps'],     order: 8 },
    ],
  },
  {
    name: 'Tuesday', tag: 'Lower A + Arms', isRest: false, dayOrder: 2,
    exercises: [
      { name: 'Leg Press',                    sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Quads'],       order: 0 },
      { name: 'Leg Extension',                sets: 3, reps: 10, weight: 0, weightUnit: 'lbs', muscleTargets: ['Quads'],       order: 1 },
      { name: 'Lying Ham Curls',              sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Hamstrings'],  order: 2 },
      { name: 'Smith Machine Hip Thrust',     sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Glutes'],      order: 3 },
      { name: 'Back Extension',               sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Lower Back'],  order: 4 },
      { name: 'Standing Calf Raises',         sets: 3, reps: 15, weight: 0, weightUnit: 'lbs', muscleTargets: ['Calves'],      order: 5 },
      { name: 'Hammer Curl',                  sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Biceps'],      order: 6 },
      { name: 'Overhead Tricep Extension',    sets: 3, reps: 12, weight: 0, weightUnit: 'kg',  muscleTargets: ['Triceps'],     order: 7 },
    ],
  },
  {
    name: 'Wednesday', tag: '', isRest: true, dayOrder: 3, exercises: [],
  },
  {
    name: 'Thursday', tag: 'Upper B · Back + Shoulders', isRest: false, dayOrder: 4,
    exercises: [
      { name: 'Lat Pulldown',           sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Lats'],        order: 0 },
      { name: 'Seated Cable Row',       sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Upper Back'],  order: 1 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 0, weightUnit: 'lbs', muscleTargets: ['Upper Chest'], order: 2 },
      { name: 'Butterfly',              sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Chest'],       order: 3 },
      { name: 'Shoulder Press',         sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Front Delts'], order: 4 },
      { name: 'Reverse Machine Flyes',  sets: 3, reps: 12, weight: 0, weightUnit: 'kg',  muscleTargets: ['Rear Delts'],  order: 5 },
      { name: 'Cable Lateral Raise',    sets: 3, reps: 12, weight: 0, weightUnit: 'kg',  muscleTargets: ['Side Delts'],  order: 6 },
      { name: 'Preacher Curl',          sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Biceps'],      order: 7 },
      { name: 'Tricep Dips',            sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Triceps'],     order: 8 },
    ],
  },
  {
    name: 'Friday', tag: 'Lower B + Arms', isRest: false, dayOrder: 5,
    exercises: [
      { name: 'SLDL',                      sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Hamstrings', 'Lower Back'], order: 0 },
      { name: 'Leg Press (feet high)',      sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Glutes', 'Hamstrings'],     order: 1 },
      { name: 'Leg Extension',             sets: 3, reps: 10, weight: 0, weightUnit: 'lbs', muscleTargets: ['Quads'],                    order: 2 },
      { name: 'Smith Machine Hip Thrust',  sets: 3, reps: 10, weight: 0, weightUnit: 'kg',  muscleTargets: ['Glutes'],                   order: 3 },
      { name: 'Standing Calf Raise',       sets: 3, reps: 15, weight: 0, weightUnit: 'lbs', muscleTargets: ['Calves'],                   order: 4 },
      { name: 'Ab Crunches',               sets: 3, reps: 15, weight: 0, weightUnit: 'kg',  muscleTargets: ['Abs'],                      order: 5 },
      { name: 'Reverse Cable Curl',        sets: 3, reps: 12, weight: 0, weightUnit: 'kg',  muscleTargets: ['Forearms', 'Biceps'],        order: 6 },
      { name: 'Tricep Pushdown',           sets: 3, reps: 12, weight: 0, weightUnit: 'kg',  muscleTargets: ['Triceps'],                  order: 7 },
    ],
  },
  {
    name: 'Saturday', tag: '', isRest: true, dayOrder: 6, exercises: [],
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const split = await Split.findOne({ userId: USER_ID, name: /upper lower/i });
  if (!split) { console.error('Upper Lower split not found.'); process.exit(1); }
  split.days = days;
  split.isActive = true;
  await split.save();
  console.log(`✓ Updated "${split.name}" with ${days.length} days (${days.filter(d => !d.isRest).length} training, ${days.filter(d => d.isRest).length} rest)`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
