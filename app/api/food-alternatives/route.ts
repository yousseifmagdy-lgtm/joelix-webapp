type TargetFood = {
  name?: string;
  foodGroup?: string;
  quantityGrams?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

type MacroVector = { calories: number; protein: number; carbs: number; fat: number };
type ReferenceFood = MacroVector & { name: string; category: string };

// Per-100 g reference values curated from USDA FoodData Central generic foods.
const referenceFoods: ReferenceFood[] = [
  { name: "Apple, raw with skin", category: "Fruit", calories: 52, protein: .3, carbs: 13.8, fat: .2 },
  { name: "Banana, raw", category: "Fruit", calories: 89, protein: 1.1, carbs: 22.8, fat: .3 },
  { name: "Orange, raw", category: "Fruit", calories: 47, protein: .9, carbs: 11.8, fat: .1 },
  { name: "Strawberries, raw", category: "Fruit", calories: 32, protein: .7, carbs: 7.7, fat: .3 },
  { name: "Blueberries, raw", category: "Fruit", calories: 57, protein: .7, carbs: 14.5, fat: .3 },
  { name: "Pear, raw", category: "Fruit", calories: 57, protein: .4, carbs: 15.2, fat: .1 },
  { name: "Grapes, raw", category: "Fruit", calories: 69, protein: .7, carbs: 18.1, fat: .2 },
  { name: "Watermelon, raw", category: "Fruit", calories: 30, protein: .6, carbs: 7.6, fat: .2 },
  { name: "Greek yogurt, plain nonfat", category: "Dairy", calories: 59, protein: 10.3, carbs: 3.6, fat: .4 },
  { name: "Cottage cheese, low fat", category: "Dairy", calories: 82, protein: 11.1, carbs: 3.4, fat: 2.3 },
  { name: "Milk, skim", category: "Dairy", calories: 34, protein: 3.4, carbs: 5, fat: .1 },
  { name: "Mozzarella, part skim", category: "Dairy", calories: 254, protein: 24.3, carbs: 2.8, fat: 15.9 },
  { name: "Chicken breast, cooked", category: "Lean protein", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Turkey breast, roasted", category: "Lean protein", calories: 147, protein: 30.1, carbs: 0, fat: 2.1 },
  { name: "Chicken thigh, roasted skinless", category: "Lean protein", calories: 179, protein: 24.8, carbs: 0, fat: 8.2 },
  { name: "Turkey thigh, roasted skinless", category: "Lean protein", calories: 170, protein: 25.6, carbs: 0, fat: 6.4 },
  { name: "Beef sirloin, grilled lean", category: "Meat", calories: 206, protein: 29, carbs: 0, fat: 9 },
  { name: "Pork tenderloin, roasted", category: "Meat", calories: 143, protein: 26, carbs: 0, fat: 3.5 },
  { name: "Lamb leg, roasted lean", category: "Meat", calories: 191, protein: 28.3, carbs: 0, fat: 7.7 },
  { name: "Tuna, light canned in water", category: "Seafood", calories: 116, protein: 25.5, carbs: 0, fat: .8 },
  { name: "Cod, cooked", category: "Fish", calories: 89, protein: 19.9, carbs: 0, fat: .7 },
  { name: "Shrimp, cooked", category: "Seafood", calories: 99, protein: 24, carbs: .2, fat: .3 },
  { name: "Tilapia, cooked", category: "Fish", calories: 128, protein: 26.2, carbs: 0, fat: 2.7 },
  { name: "Salmon, cooked", category: "Fish", calories: 206, protein: 22, carbs: 0, fat: 12 },
  { name: "Whole egg, cooked", category: "Egg", calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6 },
  { name: "Egg whites, cooked", category: "Egg", calories: 52, protein: 10.9, carbs: .7, fat: .2 },
  { name: "Tofu, firm", category: "Plant protein", calories: 144, protein: 17.3, carbs: 2.8, fat: 8.7 },
  { name: "Lentils, cooked", category: "Legume", calories: 116, protein: 9, carbs: 20.1, fat: .4 },
  { name: "Chickpeas, cooked", category: "Legume", calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6 },
  { name: "White rice, cooked", category: "Grain", calories: 130, protein: 2.7, carbs: 28.2, fat: .3 },
  { name: "Brown rice, cooked", category: "Grain", calories: 123, protein: 2.7, carbs: 25.6, fat: 1 },
  { name: "Pasta, cooked", category: "Grain", calories: 157, protein: 5.8, carbs: 30.9, fat: .9 },
  { name: "Quinoa, cooked", category: "Grain", calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9 },
  { name: "Oatmeal, cooked", category: "Grain", calories: 71, protein: 2.5, carbs: 12, fat: 1.5 },
  { name: "Whole-wheat bread", category: "Bread", calories: 252, protein: 12.5, carbs: 43.1, fat: 3.5 },
  { name: "Sweet potato, baked", category: "Starchy vegetable", calories: 90, protein: 2, carbs: 20.7, fat: .2 },
  { name: "Broccoli, cooked", category: "Vegetable", calories: 35, protein: 2.4, carbs: 7.2, fat: .4 },
  { name: "Carrots, cooked", category: "Vegetable", calories: 35, protein: .8, carbs: 8.2, fat: .2 },
  { name: "Spinach, cooked", category: "Vegetable", calories: 23, protein: 3, carbs: 3.8, fat: .3 },
  { name: "Cauliflower, cooked", category: "Vegetable", calories: 23, protein: 1.8, carbs: 4.1, fat: .5 },
  { name: "Green beans, cooked", category: "Vegetable", calories: 35, protein: 1.9, carbs: 7.9, fat: .3 },
  { name: "Zucchini, cooked", category: "Vegetable", calories: 15, protein: 1.1, carbs: 2.7, fat: .4 },
  { name: "Avocado, raw", category: "Fat", calories: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  { name: "Almonds", category: "Nuts", calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9 },
  { name: "Cashews", category: "Nuts", calories: 553, protein: 18.2, carbs: 30.2, fat: 43.9 },
  { name: "Walnuts", category: "Nuts", calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2 },
  { name: "Peanut butter, smooth", category: "Nut spread", calories: 588, protein: 25, carbs: 20, fat: 50 },
  { name: "Olive oil", category: "Fat", calories: 884, protein: 0, carbs: 0, fat: 100 },
];

function cleanName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function canonicalFoodGroup(name: string, supplied = "") {
  const value = `${name} ${supplied}`.toLowerCase();
  if (/apple|banana|orange|strawberr|blueberr|pear|grape|watermelon|peach|plum|mango|fruit/.test(value)) return "Fruit";
  if (/sweet potato|broccoli|carrot|spinach|cauliflower|green bean|zucchini|vegetable/.test(value)) return "Vegetable";
  if (/rice|oat|pasta|quinoa|bread|barley|grain|wheat/.test(value)) return "Grain";
  if (/lentil|chickpea|bean|tofu|soy|legume|plant protein/.test(value)) return "Legume";
  if (/yogurt|cheese|milk|dairy/.test(value)) return "Dairy";
  if (/egg/.test(value)) return "Egg";
  if (/chicken|turkey|poultry|lean protein/.test(value)) return "Poultry";
  if (/beef|pork|lamb|veal|meat/.test(value)) return "Meat";
  if (/tuna|cod|shrimp|tilapia|salmon|fish|seafood/.test(value)) return "Fish & seafood";
  if (/almond|cashew|walnut|peanut|nut|seed/.test(value)) return "Nuts & seeds";
  if (/avocado|olive oil|oil|fat/.test(value)) return "Fats & oils";
  return supplied.trim() || "Other";
}

function macroDistance(target: MacroVector, candidate: MacroVector) {
  const normalized = (actual: number, expected: number, floor: number) => Math.abs(actual - expected) / Math.max(expected, floor);
  return normalized(candidate.calories, target.calories, 50) * 2
    + normalized(candidate.protein, target.protein, 5) * 1.35
    + normalized(candidate.carbs, target.carbs, 8)
    + normalized(candidate.fat, target.fat, 4) * 1.15;
}

function matchPercentage(target: MacroVector, candidate: MacroVector) {
  const accuracy = (actual: number, expected: number, floor: number) => Math.max(0, 1 - Math.abs(actual - expected) / Math.max(expected, floor));
  return Math.round(100 * (
    accuracy(candidate.calories, target.calories, 50) * .45
    + accuracy(candidate.protein, target.protein, 5) * .25
    + accuracy(candidate.carbs, target.carbs, 8) * .17
    + accuracy(candidate.fat, target.fat, 4) * .13
  ));
}

export async function POST(request: Request) {
  let body: TargetFood;
  try {
    body = (await request.json()) as TargetFood;
  } catch {
    return Response.json({ error: "Send a valid food macro profile." }, { status: 400 });
  }

  const target: MacroVector = {
    calories: Math.max(0, Number(body.calories) || 0),
    protein: Math.max(0, Number(body.protein) || 0),
    carbs: Math.max(0, Number(body.carbs) || 0),
    fat: Math.max(0, Number(body.fat) || 0),
  };
  if (target.calories <= 0) return Response.json({ error: "The original food needs a calorie value first." }, { status: 400 });

  const originalName = cleanName(body.name || "");
  const targetGroup = canonicalFoodGroup(body.name || "", body.foodGroup || "");
  const originalGrams = Math.max(1, Number(body.quantityGrams) || 100);
  const scored = referenceFoods.filter((food) => {
    const name = cleanName(food.name);
    return canonicalFoodGroup(food.name, food.category) === targetGroup
      && (!originalName || (!name.includes(originalName) && !originalName.includes(name)));
  }).map((food) => {
    let best = { grams: 0, distance: Number.POSITIVE_INFINITY, calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (let grams = 10; grams <= 600; grams += 2) {
      if (Math.abs(grams - originalGrams) < 6) continue;
      const ratio = grams / 100;
      const candidate = { calories: food.calories * ratio, protein: food.protein * ratio, carbs: food.carbs * ratio, fat: food.fat * ratio };
      const distance = macroDistance(target, candidate);
      if (distance < best.distance) best = { grams, distance, ...candidate };
    }
    return {
      name: food.name,
      category: targetGroup,
      quantityGrams: best.grams,
      calories: Math.round(best.calories),
      protein: Math.round(best.protein * 10) / 10,
      carbs: Math.round(best.carbs * 10) / 10,
      fat: Math.round(best.fat * 10) / 10,
      matchPercent: matchPercentage(target, best),
      calorieDifference: Math.round(best.calories - target.calories),
      proteinDifference: Math.round((best.protein - target.protein) * 10) / 10,
      carbsDifference: Math.round((best.carbs - target.carbs) * 10) / 10,
      fatDifference: Math.round((best.fat - target.fat) * 10) / 10,
      source: "USDA reference · macro-ranked",
      distance: best.distance,
    };
  }).filter((food) => food.matchPercent >= 80).sort((a, b) => a.distance - b.distance);

  const diversified = scored.slice(0, 5);

  return Response.json({
    alternatives: diversified.map(({ distance, ...food }) => food),
    foodGroup: targetGroup,
    sameGroupOnly: true,
    method: "USDA macro-vector similarity with portion optimization inside the same food group",
    minimumMatchPercent: 80,
    help: [
      `All suggestions stay in the ${targetGroup} group.`,
      "Every result shown is at least an 80% match across calories, protein, carbohydrate, and fat.",
      "If no swap appears, adjust the original food weight or search USDA for a similar product.",
    ],
    verified: true,
  }, { headers: { "Cache-Control": "no-store" } });
}
