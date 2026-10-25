export type Screen = "home" | "tasks" | "todo" | "workout" | "youtube" | "whop" | "ideas" | "food" | "player" | "coach" | "store" | "history";
export type TaskKind = "physical" | "work";
export type TaskPriority = "main" | "optional" | "bonus";
export type ContentPlatform = "youtube" | "instagram" | "tiktok";

export type CoinTask = {
  id: number;
  name: string;
  category: string;
  reward: number;
  recurrence: "Daily" | "One-off";
  kind: TaskKind;
  doneToday: boolean;
  icon: string;
  xp: number;
  priority: TaskPriority;
};

export type FoodEntry = {
  id: number;
  name: string;
  calories: number;
  time: string;
  loggedOn?: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  serving?: string;
  fdcId?: number;
  source?: string;
  eaten?: boolean;
};

export type CalorieCycle = {
  active: boolean;
  key: string;
  baseCalories: number;
  length: number;
  day: number;
  daysUntilStart: number;
  startLabel: string;
  endLabel: string;
};

export type SpendEntry = {
  id: number;
  name: string;
  amount: number;
  date: string;
  category: string;
};

export type DebtEntry = {
  id: number;
  creditor: string;
  amount: number;
  remaining: number;
  createdOn: string;
  status: "active" | "paid";
  paidOn?: string;
};

export type UsdaFood = {
  fdcId: number;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  serving: string;
  foodType?: string;
  foodGroup?: string;
  micronutrients?: FoodMicronutrient[];
  components?: FuelMealComponent[];
  componentServingGrams?: number;
  nutritionBasis?: "per100g" | "perServing";
  source?: string;
  savedOn?: string;
};

export type FoodMicronutrient = {
  key: string;
  label: string;
  value: number;
  unit: string;
};

export type FuelMealComponent = {
  id: string;
  food: UsdaFood;
  grams: number;
};

export type FuelTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type FuelFoodItem = {
  id: string;
  name: string;
  usdaFdcId?: number;
  source: string;
  quantity: number;
  unit: "g" | "serving" | "piece";
  gramsPerUnit: number;
  quantityGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foodType?: string;
  foodGroup?: string;
  micronutrients?: FoodMicronutrient[];
  components?: FuelMealComponent[];
  nutritionBasis?: "per100g" | "perServing";
  fiber?: number;
  sugar?: number;
  sodium?: number;
};

export type FuelMeal = {
  id: string;
  name: string;
  foods: FuelFoodItem[];
};

export type FuelDay = {
  date: string;
  meals: FuelMeal[];
};

export type FuelState = {
  startDate: string;
  targets: FuelTargets;
  days: FuelDay[];
  scheduleVersion?: number;
};

export type WeightEntry = {
  id: number;
  weightKg: number;
  loggedOn: string;
};

export type MoodEntry = {
  id: number;
  score: number;
  label: string;
  note: string;
  loggedOn: string;
};

export type WishlistItem = {
  id: number;
  name: string;
  targetAmount: number;
  category: string;
  addedOn: string;
};

export type WhopContentItem = {
  id: number;
  title: string;
  platform: ContentPlatform;
  views: number;
  url?: string;
  createdOn: string;
  claimed: boolean;
};

export type WhopRewardRates = Record<ContentPlatform, number>;

export type TodoCategory = "Work" | "Health" | "Money" | "Content" | "Learning" | "Personal" | "Home" | "Other";

export type TodoItem = {
  id: string;
  title: string;
  progress: number;
  done: boolean;
  createdAt: string;
};

export type TodoList = {
  id: string;
  title: string;
  category: TodoCategory;
  date: string;
  items: TodoItem[];
};

export type TodoPlannerState = {
  lists: TodoList[];
};
