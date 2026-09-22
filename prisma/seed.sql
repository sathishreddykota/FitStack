-- FitStack Food Database Seed
-- Run this in Supabase SQL Editor to populate the food database
-- All nutrition values are per 100g

INSERT INTO "Food" (id, name, category, "caloriesPer100g", "proteinPer100g", "carbsPer100g", "fatPer100g", "fiberPer100g", "defaultServingSizeG", "defaultServingUnit", "isVerified", "isPublic", "createdAt", "updatedAt")
VALUES
-- GRAINS & CEREALS
(gen_random_uuid(), 'White Rice (Cooked)', 'GRAINS_CEREALS', 130, 2.7, 28.2, 0.3, 0.4, 200, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Brown Rice (Cooked)', 'GRAINS_CEREALS', 123, 2.7, 25.6, 0.9, 1.8, 200, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Basmati Rice (Cooked)', 'GRAINS_CEREALS', 121, 3.5, 25.2, 0.4, 0.4, 200, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Rolled Oats (Dry)', 'GRAINS_CEREALS', 379, 13.2, 67.7, 6.9, 10.1, 60, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Wheat Roti / Chapati', 'GRAINS_CEREALS', 297, 8.5, 56.4, 5.8, 2.2, 40, 'piece', true, true, now(), now()),
(gen_random_uuid(), 'Whole Wheat Bread', 'GRAINS_CEREALS', 247, 9.0, 44.0, 3.5, 6.0, 30, 'slice', true, true, now(), now()),
(gen_random_uuid(), 'Idli (1 piece)', 'GRAINS_CEREALS', 58, 2.0, 11.4, 0.5, 0.5, 45, 'piece', true, true, now(), now()),
(gen_random_uuid(), 'Dosa (plain)', 'GRAINS_CEREALS', 171, 3.9, 31.5, 3.7, 0.5, 75, 'piece', true, true, now(), now()),
(gen_random_uuid(), 'Poha (Cooked)', 'GRAINS_CEREALS', 180, 3.5, 36.0, 3.0, 0.8, 150, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Quinoa (Cooked)', 'GRAINS_CEREALS', 120, 4.4, 21.3, 1.9, 2.8, 185, 'g', true, true, now(), now()),

-- LEGUMES & PULSES
(gen_random_uuid(), 'Toor Dal (Cooked)', 'LEGUMES_PULSES', 116, 6.8, 19.6, 0.4, 3.1, 200, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Moong Dal (Cooked)', 'LEGUMES_PULSES', 105, 7.0, 18.8, 0.4, 2.7, 200, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Chana Dal (Cooked)', 'LEGUMES_PULSES', 164, 8.7, 27.6, 2.7, 8.0, 200, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Rajma / Kidney Beans (Cooked)', 'LEGUMES_PULSES', 127, 8.7, 22.8, 0.5, 7.4, 200, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Chickpeas / Chhole (Cooked)', 'LEGUMES_PULSES', 164, 8.9, 27.4, 2.6, 7.6, 200, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Sambar', 'LEGUMES_PULSES', 45, 2.5, 7.2, 0.8, 1.5, 200, 'ml', true, true, now(), now()),

-- DAIRY
(gen_random_uuid(), 'Whole Milk', 'DAIRY', 61, 3.2, 4.8, 3.3, 0, 200, 'ml', true, true, now(), now()),
(gen_random_uuid(), 'Toned Milk (2% fat)', 'DAIRY', 44, 3.2, 4.8, 1.5, 0, 200, 'ml', true, true, now(), now()),
(gen_random_uuid(), 'Paneer', 'DAIRY', 265, 18.3, 2.6, 20.8, 0, 100, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Curd / Dahi (Plain)', 'DAIRY', 61, 3.1, 4.7, 3.2, 0, 200, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Greek Yogurt (Plain, Full Fat)', 'DAIRY', 97, 9.0, 3.6, 5.0, 0, 150, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Cottage Cheese (Low Fat)', 'DAIRY', 98, 11.1, 3.4, 4.3, 0, 100, 'g', true, true, now(), now()),

-- EGGS
(gen_random_uuid(), 'Whole Egg', 'EGGS', 155, 12.6, 1.1, 11.0, 0, 55, 'piece', true, true, now(), now()),
(gen_random_uuid(), 'Egg White', 'EGGS', 52, 10.9, 0.7, 0.2, 0, 33, 'piece', true, true, now(), now()),
(gen_random_uuid(), 'Egg Yolk', 'EGGS', 322, 15.9, 3.6, 26.5, 0, 17, 'piece', true, true, now(), now()),

-- MEAT & POULTRY
(gen_random_uuid(), 'Chicken Breast (Cooked)', 'MEAT_POULTRY', 165, 31.0, 0, 3.6, 0, 150, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Chicken Thigh (Cooked, Skinless)', 'MEAT_POULTRY', 209, 25.9, 0, 10.9, 0, 100, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Lean Ground Beef (Cooked)', 'MEAT_POULTRY', 215, 26.1, 0, 11.8, 0, 100, 'g', true, true, now(), now()),

-- SEAFOOD
(gen_random_uuid(), 'Rohu Fish (Cooked)', 'SEAFOOD', 97, 16.6, 0, 3.4, 0, 150, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Tuna (Canned in Water)', 'SEAFOOD', 116, 25.5, 0, 1.0, 0, 100, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Salmon (Cooked)', 'SEAFOOD', 206, 28.8, 0, 9.8, 0, 150, 'g', true, true, now(), now()),

-- VEGETABLES
(gen_random_uuid(), 'Spinach (Raw)', 'VEGETABLES', 23, 2.9, 3.6, 0.4, 2.2, 100, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Broccoli (Cooked)', 'VEGETABLES', 35, 2.4, 7.2, 0.4, 3.3, 150, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Sweet Potato (Baked)', 'VEGETABLES', 90, 2.0, 20.7, 0.1, 3.3, 150, 'g', true, true, now(), now()),

-- FRUITS
(gen_random_uuid(), 'Banana', 'FRUITS', 89, 1.1, 23.0, 0.3, 2.6, 120, 'piece', true, true, now(), now()),
(gen_random_uuid(), 'Apple', 'FRUITS', 52, 0.3, 14.0, 0.2, 2.4, 180, 'piece', true, true, now(), now()),
(gen_random_uuid(), 'Mango', 'FRUITS', 60, 0.8, 15.0, 0.4, 1.6, 200, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Papaya', 'FRUITS', 43, 0.5, 11.0, 0.3, 1.7, 200, 'g', true, true, now(), now()),

-- NUTS & SEEDS
(gen_random_uuid(), 'Almonds', 'NUTS_SEEDS', 579, 21.2, 21.7, 49.9, 12.5, 30, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Peanut Butter (Regular)', 'NUTS_SEEDS', 588, 25.1, 20.1, 50.4, 6.0, 32, 'tbsp', true, true, now(), now()),
(gen_random_uuid(), 'Cashews', 'NUTS_SEEDS', 553, 18.2, 30.2, 43.9, 3.3, 30, 'g', true, true, now(), now()),
(gen_random_uuid(), 'Walnuts', 'NUTS_SEEDS', 654, 15.2, 13.7, 65.2, 6.7, 30, 'g', true, true, now(), now()),

-- SUPPLEMENTS
(gen_random_uuid(), 'Whey Protein Powder', 'SUPPLEMENTS', 400, 80.0, 6.0, 5.0, 0, 30, 'scoop', true, true, now(), now()),
(gen_random_uuid(), 'Creatine Monohydrate', 'SUPPLEMENTS', 0, 0, 0, 0, 0, 5, 'g', true, true, now(), now()),

-- FATS & OILS
(gen_random_uuid(), 'Ghee', 'FATS_OILS', 900, 0, 0, 100, 0, 10, 'tsp', true, true, now(), now()),
(gen_random_uuid(), 'Coconut Oil', 'FATS_OILS', 892, 0, 0, 99.1, 0, 14, 'tbsp', true, true, now(), now()),
(gen_random_uuid(), 'Olive Oil', 'FATS_OILS', 884, 0, 0, 100, 0, 14, 'tbsp', true, true, now(), now())

ON CONFLICT DO NOTHING;
