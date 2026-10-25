type Nutrient = {
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
};

type FoodResult = {
  fdcId: number;
  description: string;
  brandName?: string;
  dataType?: string;
  foodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: Nutrient[];
};

type MicroDefinition = { key: string; label: string; ids: number[]; names: string[]; unit: string };

const fallbackFoods = [
  { fdcId: -1, name: "BANANA, RAW", calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, foodType: "USDA generic", serving: "Estimated per 100 g", micronutrients: [{ key: "potassium", label: "Potassium", value: 358, unit: "mg" }, { key: "vitamin-b6", label: "Vitamin B6", value: .367, unit: "mg" }, { key: "vitamin-c", label: "Vitamin C", value: 8.7, unit: "mg" }] },
  { fdcId: -2, name: "APPLE, RAW, WITH SKIN", calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, foodType: "USDA generic", serving: "Estimated per 100 g", micronutrients: [{ key: "potassium", label: "Potassium", value: 107, unit: "mg" }, { key: "vitamin-c", label: "Vitamin C", value: 4.6, unit: "mg" }, { key: "calcium", label: "Calcium", value: 6, unit: "mg" }] },
  { fdcId: -3, name: "CHICKEN BREAST, COOKED", calories: 165, protein: 31, carbs: 0, fat: 3.6, foodType: "USDA generic", serving: "Estimated per 100 g", micronutrients: [{ key: "phosphorus", label: "Phosphorus", value: 220, unit: "mg" }, { key: "selenium", label: "Selenium", value: 27.6, unit: "mcg" }, { key: "vitamin-b6", label: "Vitamin B6", value: .6, unit: "mg" }] },
  { fdcId: -4, name: "WHITE RICE, COOKED", calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, foodType: "USDA generic", serving: "Estimated per 100 g", micronutrients: [{ key: "manganese", label: "Manganese", value: .37, unit: "mg" }, { key: "selenium", label: "Selenium", value: 7.5, unit: "mcg" }, { key: "folate", label: "Folate", value: 58, unit: "mcg" }] },
  { fdcId: -5, name: "WHOLE EGG, COOKED", calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6, foodType: "USDA generic", serving: "Estimated per 100 g", micronutrients: [{ key: "vitamin-a", label: "Vitamin A", value: 149, unit: "mcg" }, { key: "vitamin-b12", label: "Vitamin B12", value: 1.1, unit: "mcg" }, { key: "selenium", label: "Selenium", value: 30.8, unit: "mcg" }] },
  { fdcId: -6, name: "PLAIN GREEK YOGURT", calories: 97, protein: 9, carbs: 3.9, fat: 5, foodType: "USDA generic", serving: "Estimated per 100 g", micronutrients: [{ key: "calcium", label: "Calcium", value: 100, unit: "mg" }, { key: "phosphorus", label: "Phosphorus", value: 135, unit: "mg" }, { key: "vitamin-b12", label: "Vitamin B12", value: .52, unit: "mcg" }] },
  { fdcId: -7, name: "OATS, COOKED", calories: 71, protein: 2.5, carbs: 12, fat: 1.5, foodType: "USDA generic", serving: "Estimated per 100 g", micronutrients: [{ key: "magnesium", label: "Magnesium", value: 27, unit: "mg" }, { key: "phosphorus", label: "Phosphorus", value: 77, unit: "mg" }, { key: "iron", label: "Iron", value: .9, unit: "mg" }] },
];

const microDefinitions: MicroDefinition[] = [
  { key: "calcium", label: "Calcium", ids: [1087], names: ["calcium, ca"], unit: "mg" },
  { key: "iron", label: "Iron", ids: [1089], names: ["iron, fe"], unit: "mg" },
  { key: "magnesium", label: "Magnesium", ids: [1090], names: ["magnesium, mg"], unit: "mg" },
  { key: "phosphorus", label: "Phosphorus", ids: [1091], names: ["phosphorus, p"], unit: "mg" },
  { key: "potassium", label: "Potassium", ids: [1092], names: ["potassium, k"], unit: "mg" },
  { key: "sodium", label: "Sodium", ids: [1093], names: ["sodium, na"], unit: "mg" },
  { key: "zinc", label: "Zinc", ids: [1095], names: ["zinc, zn"], unit: "mg" },
  { key: "copper", label: "Copper", ids: [1098], names: ["copper, cu"], unit: "mg" },
  { key: "manganese", label: "Manganese", ids: [1101], names: ["manganese, mn"], unit: "mg" },
  { key: "selenium", label: "Selenium", ids: [1103], names: ["selenium, se"], unit: "mcg" },
  { key: "vitamin-a", label: "Vitamin A", ids: [1106], names: ["vitamin a, rae"], unit: "mcg" },
  { key: "vitamin-c", label: "Vitamin C", ids: [1162], names: ["vitamin c, total ascorbic acid"], unit: "mg" },
  { key: "vitamin-d", label: "Vitamin D", ids: [1114], names: ["vitamin d (d2 + d3)"], unit: "mcg" },
  { key: "vitamin-e", label: "Vitamin E", ids: [1109], names: ["vitamin e (alpha-tocopherol)"], unit: "mg" },
  { key: "vitamin-k", label: "Vitamin K", ids: [1185], names: ["vitamin k (phylloquinone)"], unit: "mcg" },
  { key: "thiamin", label: "Vitamin B1", ids: [1165], names: ["thiamin"], unit: "mg" },
  { key: "riboflavin", label: "Vitamin B2", ids: [1166], names: ["riboflavin"], unit: "mg" },
  { key: "niacin", label: "Vitamin B3", ids: [1167], names: ["niacin"], unit: "mg" },
  { key: "vitamin-b6", label: "Vitamin B6", ids: [1175], names: ["vitamin b-6"], unit: "mg" },
  { key: "folate", label: "Folate", ids: [1177], names: ["folate, total"], unit: "mcg" },
  { key: "vitamin-b12", label: "Vitamin B12", ids: [1178], names: ["vitamin b-12"], unit: "mcg" },
];

function fallbackSearch(query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = fallbackFoods.filter((food) => words.some((word) => food.name.toLowerCase().includes(word)));
  const selected = matches.length > 0 ? matches : fallbackFoods.slice(0, 5);
  const groups: Record<number, string> = { [-1]: "Fruit", [-2]: "Fruit", [-3]: "Poultry", [-4]: "Grain", [-5]: "Egg", [-6]: "Dairy", [-7]: "Grain" };
  return selected.map((food) => ({ ...food, foodGroup: groups[food.fdcId] || "Other" }));
}

function nutrient(food: FoodResult, ids: number[], names: string[]) {
  const byId = ids.map((id) => food.foodNutrients?.find((item) => item.nutrientId === id)).find(Boolean);
  const byName = food.foodNutrients?.find((item) => names.some((name) => item.nutrientName?.toLowerCase() === name) && item.unitName?.toLowerCase() !== "kj");
  return Math.max(0, Number((byId ?? byName)?.value ?? 0));
}

function micronutrients(food: FoodResult) {
  return microDefinitions.map((definition) => ({
    key: definition.key,
    label: definition.label,
    value: Number(nutrient(food, definition.ids, definition.names).toFixed(2)),
    unit: definition.unit,
  })).filter((item) => item.value > 0);
}

function foodSearchRank(food: { name: string; brand?: string }, query: string) {
  const name = food.name.toLowerCase().trim();
  const target = query.toLowerCase().trim();
  let rank = food.brand ? 100 : 0;
  if (name === target || name === `${target}, raw` || name === `${target}s, raw`) rank -= 70;
  if (name.startsWith(target)) rank -= 20;
  if (/\braw\b/.test(name)) rank -= 10;
  return rank;
}

function foodGroup(food: FoodResult) {
  const value = `${food.description} ${food.foodCategory || ""}`.toLowerCase();
  if (/apple|banana|orange|berry|berries|grape|pear|peach|plum|melon|mango|pineapple|kiwi|fruit/.test(value)) return "Fruit";
  if (/broccoli|carrot|spinach|lettuce|cabbage|cauliflower|cucumber|tomato|pepper|onion|vegetable|greens/.test(value)) return "Vegetable";
  if (/rice|oat|pasta|bread|cereal|quinoa|barley|grain|flour|wheat|cornmeal/.test(value)) return "Grain";
  if (/bean|lentil|chickpea|pea,|legume/.test(value)) return "Legume";
  if (/milk|yogurt|cheese|dairy|cream/.test(value)) return "Dairy";
  if (/egg/.test(value)) return "Egg";
  if (/chicken|turkey|poultry/.test(value)) return "Poultry";
  if (/beef|pork|lamb|veal|meat/.test(value)) return "Meat";
  if (/fish|salmon|tuna|cod|tilapia|shrimp|seafood|shellfish/.test(value)) return "Fish & seafood";
  if (/almond|walnut|cashew|peanut|nut|seed/.test(value)) return "Nuts & seeds";
  if (/oil|butter|margarine|avocado|fat/.test(value)) return "Fats & oils";
  if (/juice|drink|beverage|coffee|tea|soda/.test(value)) return "Beverage";
  if (/candy|cake|cookie|chocolate|dessert|sweet/.test(value)) return "Sweets";
  return food.foodCategory || (food.brandName ? "Product" : "Other");
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json({ error: "Enter at least two letters." }, { status: 400 });

  const configuredKey = process.env.USDA_API_KEY?.trim();
  const requestKey = request.headers.get("x-usda-api-key")?.trim();
  const apiKey = requestKey && /^[A-Za-z0-9_-]{8,128}$/.test(requestKey) ? requestKey : configuredKey || "DEMO_KEY";
  const usingDemoKey = apiKey === "DEMO_KEY";
  const endpoint = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  endpoint.searchParams.set("api_key", apiKey);
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("pageSize", "12");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let failureStatus = 0;

  try {
    const response = await fetch(endpoint, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) {
      failureStatus = response.status;
      throw new Error(`USDA returned ${response.status}.`);
    }

    const payload = (await response.json()) as { foods?: FoodResult[] };
    const foods = (payload.foods ?? []).map((food) => ({
      fdcId: food.fdcId,
      name: food.description,
      brand: food.brandName,
      calories: Math.round(nutrient(food, [1008, 2047, 2048], ["energy"])),
      protein: Number(nutrient(food, [1003], ["protein"]).toFixed(1)),
      carbs: Number(nutrient(food, [1005], ["carbohydrate, by difference"]).toFixed(1)),
      fat: Number(nutrient(food, [1004], ["total lipid (fat)"]).toFixed(1)),
      fiber: Number(nutrient(food, [1079], ["fiber, total dietary"]).toFixed(1)),
      sugar: Number(nutrient(food, [2000, 1063], ["sugars, total including nlea", "sugars, total"]).toFixed(1)),
      sodium: Number(nutrient(food, [1093], ["sodium, na"]).toFixed(1)),
      foodType: food.brandName ? "Product" : food.dataType || "USDA generic",
      foodGroup: foodGroup(food),
      micronutrients: micronutrients(food),
      serving: food.servingSize ? `Per 100 g · label serving ${food.servingSize} ${food.servingSizeUnit ?? ""}`.trim() : "Per 100 g",
    })).filter((food) => food.calories > 0 || food.protein > 0 || food.carbs > 0 || food.fat > 0)
      .sort((a, b) => foodSearchRank(a, query) - foodSearchRank(b, query));

    return Response.json({ foods, source: "USDA FoodData Central", estimated: false, basisGrams: 100, usingDemoKey });
  } catch {
    const demoLimitReached = usingDemoKey && (failureStatus === 403 || failureStatus === 429);
    return Response.json({
      foods: fallbackSearch(query),
      source: "Built-in nutrition fallback",
      estimated: true,
      basisGrams: 100,
      needsApiKey: demoLimitReached,
      notice: demoLimitReached ? "USDA public demo access is busy. Add a free USDA API key for reliable live results." : "USDA is temporarily unavailable. Showing clearly marked estimates until it reconnects.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
