-- GymMatrix Seed Data — Default Training Plan

INSERT OR IGNORE INTO training_days (id, name, order_idx, muscle_targets) VALUES
  (1, 'Chest & Shoulder Day', 1, '[{"muscle":"Chest","sets":9},{"muscle":"Delt","sets":6}]'),
  (2, 'Back Day',             2, '[{"muscle":"Back","sets":12},{"muscle":"Biceps","sets":3}]'),
  (3, 'Shoulder & Arm Day',   3, '[{"muscle":"Front Delt","sets":6},{"muscle":"Side Delt","sets":3},{"muscle":"Rear Delt","sets":3},{"muscle":"Tricep","sets":3}]'),
  (4, 'Leg Day',              4, '[{"muscle":"Quad","sets":6},{"muscle":"Hamstring","sets":3},{"muscle":"Hip","sets":3}]');

-- Chest & Shoulder Day exercises
INSERT OR IGNORE INTO exercises (training_day_id, name, order_idx, default_sets, reps_min, reps_max, equipment, is_custom) VALUES
  (1, 'Machine Chest Press',          1, 3, 10, 12, 'Smith machine or Machine', 0),
  (1, 'Dumbbell Incline Chest Press', 2, 3, 10, 12, NULL,                      0),
  (1, 'Machine Chest Fly',            3, 3, 12, 15, 'machine or cable',        0),
  (1, 'Shoulder Press',               4, 3, 10, 12, 'Smith machine or DB',     0),
  (1, 'Lateral Raise',                5, 3, 12, 15, 'dumbbell',                0);

-- Back Day exercises
INSERT OR IGNORE INTO exercises (training_day_id, name, order_idx, default_sets, reps_min, reps_max, equipment, is_custom) VALUES
  (2, 'High Row',                1, 3, 10, 12, 'Machine',              0),
  (2, 'T Bar Row',               2, 3, 10, 12, 'Chest supported T bar', 0),
  (2, 'Wide Grip Lat Pulldown',  3, 3, 10, 12, NULL,                   0),
  (2, 'Low Row / Seated Row',    4, 3, 10, 12, NULL,                   0),
  (2, 'Hammer Curl',             5, 3, 10, 15, NULL,                   0);

-- Shoulder & Arm Day exercises
INSERT OR IGNORE INTO exercises (training_day_id, name, order_idx, default_sets, reps_min, reps_max, equipment, is_custom) VALUES
  (3, 'Shoulder Press',         1, 3, 10, 12, 'Machine',         0),
  (3, 'Lateral Raise',          2, 3, 12, 15, 'Cable or machine', 0),
  (3, 'Reverse Rear Delt Fly',  3, 3, 12, 15, NULL,              0),
  (3, 'Dumbbell Front Raise',   4, 3, 12, 15, NULL,              0),
  (3, 'Cable Tricep Pushdown',  5, 3, 10, 12, NULL,              0);

-- Leg Day exercises
INSERT OR IGNORE INTO exercises (training_day_id, name, order_idx, default_sets, reps_min, reps_max, equipment, is_custom) VALUES
  (4, 'Hack Squat',             1, 3,  9, 12, NULL, 0),
  (4, 'Single Leg Leg Press',   2, 3, 12, 12, NULL, 0),
  (4, 'Leg Extension',          3, 3, 15, 15, NULL, 0),
  (4, 'Leg Curl',               4, 3, 15, 15, NULL, 0),
  (4, 'Ab Abductor Machine',    5, 3, 12, 15, NULL, 0);
