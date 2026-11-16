// Additional exercises (v2) so the plan generator can build complete,
// varied sessions for gym, dumbbell-only and bodyweight users.

type Ex = {
  name: string;
  description: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: string;
  equipment: string;
  isCompoundLift: boolean;
  isKeyLift: boolean;
};

const ex = (
  name: string,
  primaryMuscles: string[],
  secondaryMuscles: string[],
  category: string,
  equipment: string,
  isCompoundLift: boolean,
  description: string,
): Ex => ({ name, description, primaryMuscles, secondaryMuscles, category, equipment, isCompoundLift, isKeyLift: false });

export const extraExercises: Ex[] = [
  // Lower body
  ex("Front Squat", ["QUADS"], ["GLUTES", "CORE"], "STRENGTH", "BARBELL", true, "Upright squat with the bar on the front delts."),
  ex("Goblet Squat", ["QUADS", "GLUTES"], ["CORE"], "HYPERTROPHY", "DUMBBELL", true, "Squat holding one dumbbell at the chest."),
  ex("Bulgarian Split Squat", ["QUADS", "GLUTES"], ["HAMSTRINGS"], "HYPERTROPHY", "DUMBBELL", true, "Rear-foot-elevated single-leg squat."),
  ex("Walking Lunge", ["QUADS", "GLUTES"], ["HAMSTRINGS", "CALVES"], "HYPERTROPHY", "DUMBBELL", true, "Alternating forward lunges while walking."),
  ex("Leg Extension", ["QUADS"], [], "HYPERTROPHY", "MACHINE", false, "Knee extension on a machine."),
  ex("Standing Calf Raise", ["CALVES"], [], "HYPERTROPHY", "MACHINE", false, "Calf raise through full range."),
  ex("Dumbbell Romanian Deadlift", ["HAMSTRINGS", "GLUTES"], ["BACK"], "HYPERTROPHY", "DUMBBELL", true, "Hip hinge with dumbbells."),
  ex("Bodyweight Squat", ["QUADS", "GLUTES"], ["CORE"], "CONDITIONING", "BODYWEIGHT", true, "Air squat for reps."),
  ex("Glute Bridge", ["GLUTES"], ["HAMSTRINGS"], "HYPERTROPHY", "BODYWEIGHT", false, "Hip extension lying on the floor."),

  // Push
  ex("Dumbbell Bench Press", ["CHEST"], ["FRONT_DELTS", "TRICEPS"], "HYPERTROPHY", "DUMBBELL", true, "Flat press with dumbbells."),
  ex("Incline Barbell Bench Press", ["UPPER_CHEST"], ["FRONT_DELTS", "TRICEPS"], "STRENGTH", "BARBELL", true, "Bench press on a 30–45° incline."),
  ex("Seated Dumbbell Shoulder Press", ["SHOULDERS", "FRONT_DELTS"], ["TRICEPS"], "HYPERTROPHY", "DUMBBELL", true, "Overhead press seated with dumbbells."),
  ex("Push-up", ["CHEST"], ["TRICEPS", "FRONT_DELTS", "CORE"], "HYPERTROPHY", "BODYWEIGHT", true, "Classic bodyweight press."),
  ex("Dips", ["CHEST", "TRICEPS"], ["FRONT_DELTS"], "HYPERTROPHY", "BODYWEIGHT", true, "Parallel-bar dips."),
  ex("Pike Push-up", ["SHOULDERS"], ["TRICEPS"], "HYPERTROPHY", "BODYWEIGHT", true, "Hips-high push-up for shoulders."),
  ex("Skull Crusher", ["TRICEPS"], [], "HYPERTROPHY", "BARBELL", false, "Lying triceps extension."),
  ex("Overhead Dumbbell Tricep Extension", ["TRICEPS"], [], "HYPERTROPHY", "DUMBBELL", false, "Triceps extension overhead."),

  // Pull
  ex("One-Arm Dumbbell Row", ["BACK", "LATS"], ["BICEPS", "REAR_DELTS"], "HYPERTROPHY", "DUMBBELL", true, "Single-arm row supported on a bench."),
  ex("Chest-Supported Row", ["BACK"], ["REAR_DELTS", "BICEPS"], "HYPERTROPHY", "MACHINE", true, "Row with the chest on a pad."),
  ex("Face Pull", ["REAR_DELTS"], ["TRAPS"], "HYPERTROPHY", "CABLE", false, "Rope pull to the face, elbows high."),
  ex("Reverse Dumbbell Fly", ["REAR_DELTS"], ["TRAPS"], "HYPERTROPHY", "DUMBBELL", false, "Bent-over rear delt raise."),
  ex("Hammer Curl", ["BICEPS", "FOREARMS"], [], "HYPERTROPHY", "DUMBBELL", false, "Neutral-grip curl."),
  ex("Barbell Curl", ["BICEPS"], ["FOREARMS"], "HYPERTROPHY", "BARBELL", false, "Standing curl with a barbell."),
  ex("Inverted Row", ["BACK", "LATS"], ["BICEPS"], "HYPERTROPHY", "BODYWEIGHT", true, "Bodyweight row under a bar or table."),
  ex("Dumbbell Shrug", ["TRAPS"], [], "HYPERTROPHY", "DUMBBELL", false, "Shoulder shrug with dumbbells."),

  // Core
  ex("Hanging Leg Raise", ["CORE"], [], "STRENGTH", "BODYWEIGHT", false, "Leg raise hanging from a bar."),
  ex("Cable Crunch", ["CORE"], [], "HYPERTROPHY", "CABLE", false, "Kneeling crunch with a rope."),
  ex("Dead Bug", ["CORE"], [], "MOBILITY", "BODYWEIGHT", false, "Anti-extension core drill."),

  // Power & conditioning
  ex("Push Press", ["SHOULDERS"], ["TRICEPS", "QUADS"], "POWER", "BARBELL", true, "Overhead press with leg drive."),
  ex("Kettlebell Swing", ["GLUTES", "HAMSTRINGS"], ["CORE", "BACK"], "POWER", "KETTLEBELL", true, "Explosive hip hinge swing."),
  ex("Box Jump", ["QUADS", "GLUTES"], ["CALVES"], "POWER", "OTHER", true, "Explosive jump onto a box."),
  ex("Burpee", ["FULL_BODY"], [], "CONDITIONING", "BODYWEIGHT", true, "Squat, plank, push-up, jump."),
  ex("Mountain Climber", ["CORE"], ["SHOULDERS", "QUADS"], "CONDITIONING", "BODYWEIGHT", false, "Fast alternating knee drives in plank."),
  ex("Rowing Machine", ["BACK", "QUADS"], ["HAMSTRINGS", "BICEPS"], "CARDIO", "CARDIO_MACHINE", true, "Steady or interval rowing."),
  ex("Incline Treadmill Walk", ["GLUTES", "CALVES"], ["HAMSTRINGS"], "CARDIO", "CARDIO_MACHINE", false, "Low-intensity steady-state cardio."),
  ex("Farmer's Carry", ["FOREARMS", "TRAPS"], ["CORE"], "CONDITIONING", "DUMBBELL", true, "Walk holding heavy weights."),

  // Mobility (recovery days)
  ex("Hip Flexor Stretch", ["GLUTES"], [], "STRETCHING", "BODYWEIGHT", false, "Half-kneeling hip flexor stretch."),
  ex("Thoracic Rotation", ["BACK"], [], "MOBILITY", "BODYWEIGHT", false, "Open-book upper back rotation."),
];
