"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { FoodMicronutrient, FuelDay, FuelFoodItem, FuelMeal, FuelMealComponent, FuelState, FuelTargets, UsdaFood } from "./types";

type FuelView = "today" | "entry" | "history" | "report";
type PortionUnit = FuelFoodItem["unit"];

type Props = {
  state: FuelState;
  savedFoods: UsdaFood[];
  onStateChange: (state: FuelState) => void;
  onSaveFood: (food: UsdaFood) => void;
  onRemoveSavedFood: (fdcId: number, source?: string) => void;
};

type Alternative = {
  name: string;
  category: string;
  quantityGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  matchPercent: number;
  calorieDifference: number;
  proteinDifference: number;
  carbsDifference: number;
  fatDifference: number;
  source: string;
};

type NutrientTotals = { calories: number; protein: number; carbs: number; fat: number };
const FOOD_GROUPS = ["Fruit", "Vegetable", "Grain", "Legume", "Dairy", "Egg", "Poultry", "Meat", "Fish & seafood", "Nuts & seeds", "Fats & oils", "Beverage", "Sweets", "Other"] as const;
type FoodGroup = typeof FOOD_GROUPS[number];
type ManualForm = { name: string; foodType: "Meal" | "Product"; foodGroup: FoodGroup; protein: string; carbs: string; fat: string; servings: string };
type DailyMicro = FoodMicronutrient & { dailyValue: number; percent: number };

const COURSE_NAMES = ["Pre Workout Meal", "Pre Workout Snack", "Post Workout Lunch", "Afternoon Snack", "Dinner"] as const;
const LEGACY_COURSE_NAMES: Record<string, string> = {
  Breakfast: "Pre Workout Meal",
  "Morning snack": "Pre Workout Snack",
  Lunch: "Post Workout Lunch",
  "Afternoon snack": "Afternoon Snack",
};
const emptyTotals = (): NutrientTotals => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });
const emptyManual = (): ManualForm => ({ name: "", foodType: "Meal", foodGroup: "Other", protein: "", carbs: "", fat: "", servings: "1" });
const MICRO_DAILY_VALUES: Record<string, number> = {
  calcium: 1300, iron: 18, magnesium: 420, phosphorus: 1250, potassium: 4700, sodium: 2300,
  zinc: 11, copper: .9, manganese: 2.3, selenium: 55, "vitamin-a": 900, "vitamin-c": 90,
  "vitamin-d": 20, "vitamin-e": 15, "vitamin-k": 120, thiamin: 1.2, riboflavin: 1.3,
  niacin: 16, "vitamin-b6": 1.7, folate: 400, "vitamin-b12": 2.4,
};
const round1 = (value: number) => Math.round(value * 10) / 10;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function addDays(value: string, count: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + count);
  return dateKey(date);
}

function dateDistance(from: string, to: string) {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

function displayDate(value: string, long = false) {
  return new Intl.DateTimeFormat("en-US", long
    ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    : { weekday: "short", month: "short", day: "numeric" }
  ).format(parseDate(value));
}

function defaultMeals(date: string): FuelMeal[] {
  return COURSE_NAMES.map((name, index) => ({ id: `${date}-course-${index + 1}`, name, foods: [] }));
}

function ensureFiveMeals(day?: FuelDay, date = "") {
  if (!day) return { date, meals: defaultMeals(date) };
  const normalizedDay = { ...day, meals: day.meals.map((meal) => ({ ...meal, name: LEGACY_COURSE_NAMES[meal.name] || meal.name })) };
  if (normalizedDay.meals.length >= 5) return normalizedDay;
  const usedNames = new Set(normalizedDay.meals.map((meal) => meal.name.toLowerCase()));
  const additions = COURSE_NAMES.filter((name) => !usedNames.has(name.toLowerCase()))
    .slice(0, 5 - normalizedDay.meals.length)
    .map((name, index) => ({ id: `${day.date}-course-extra-${index + 1}`, name, foods: [] }));
  return { ...normalizedDay, meals: [...normalizedDay.meals, ...additions] };
}

function sumFoods(foods: FuelFoodItem[]) {
  return foods.reduce((total, food) => ({
    calories: total.calories + food.calories,
    protein: total.protein + food.protein,
    carbs: total.carbs + food.carbs,
    fat: total.fat + food.fat,
  }), emptyTotals());
}

function dayFoods(day?: FuelDay) {
  return day?.meals.flatMap((meal) => meal.foods) ?? [];
}

function scaleMicros(micros: FoodMicronutrient[] | undefined, ratio: number) {
  return micros?.map((micro) => ({ ...micro, value: Math.round(micro.value * ratio * 100) / 100 }));
}

function scaleFromPer100(food: UsdaFood, quantity: number, unit: PortionUnit, gramsPerUnit: number): FuelFoodItem {
  const safeQuantity = Math.max(0.1, Number(quantity) || 1);
  const safeGramsPerUnit = Math.max(1, Number(gramsPerUnit) || 100);
  const grams = unit === "g" ? safeQuantity : safeQuantity * safeGramsPerUnit;
  const ratio = grams / 100;
  return {
    id: uid("food"),
    name: food.brand ? `${food.name} — ${food.brand}` : food.name,
    usdaFdcId: food.fdcId,
    source: food.source || "USDA FoodData Central",
    foodType: food.foodType || (food.brand ? "Product" : "USDA food"),
    foodGroup: food.foodGroup || "Other",
    nutritionBasis: "per100g",
    quantity: safeQuantity,
    unit,
    gramsPerUnit: unit === "g" ? 1 : safeGramsPerUnit,
    quantityGrams: round1(grams),
    calories: round1(food.calories * ratio),
    protein: round1(food.protein * ratio),
    carbs: round1(food.carbs * ratio),
    fat: round1(food.fat * ratio),
    micronutrients: scaleMicros(food.micronutrients, ratio),
    components: food.components?.map((component) => ({
      ...component,
      grams: round1(component.grams * (grams / Math.max(food.componentServingGrams || grams, 1))),
    })),
  };
}

function scaleFromServing(food: UsdaFood, servings: number): FuelFoodItem {
  const safeServings = Math.max(0.1, Math.min(100, Number(servings) || 1));
  return {
    id: uid("food"),
    name: food.brand ? `${food.name} — ${food.brand}` : food.name,
    usdaFdcId: food.fdcId,
    source: food.source || "Manual Joelix",
    foodType: food.foodType || "Product",
    foodGroup: food.foodGroup || "Other",
    nutritionBasis: "perServing",
    quantity: safeServings,
    unit: "serving",
    gramsPerUnit: 1,
    quantityGrams: safeServings,
    calories: round1(food.calories * safeServings),
    protein: round1(food.protein * safeServings),
    carbs: round1(food.carbs * safeServings),
    fat: round1(food.fat * safeServings),
    micronutrients: scaleMicros(food.micronutrients, safeServings),
  };
}

function updateFoodWeight(food: FuelFoodItem, grams: number) {
  const safeGrams = Math.max(1, Math.min(5000, Number(grams) || 1));
  const ratio = safeGrams / Math.max(food.quantityGrams, 1);
  return {
    ...food,
    quantity: safeGrams,
    unit: "g" as const,
    gramsPerUnit: 1,
    quantityGrams: safeGrams,
    calories: round1(food.calories * ratio),
    protein: round1(food.protein * ratio),
    carbs: round1(food.carbs * ratio),
    fat: round1(food.fat * ratio),
    micronutrients: scaleMicros(food.micronutrients, ratio),
    components: food.components?.map((component) => ({ ...component, grams: round1(component.grams * ratio) })),
  };
}

function updateFoodServings(food: FuelFoodItem, servings: number) {
  const safeServings = Math.max(0.1, Math.min(100, Number(servings) || 0.1));
  const ratio = safeServings / Math.max(food.quantity, 0.1);
  return {
    ...food,
    quantity: safeServings,
    unit: "serving" as const,
    gramsPerUnit: 1,
    quantityGrams: safeServings,
    calories: round1(food.calories * ratio),
    protein: round1(food.protein * ratio),
    carbs: round1(food.carbs * ratio),
    fat: round1(food.fat * ratio),
    micronutrients: scaleMicros(food.micronutrients, ratio),
  };
}

function formatMicro(value: number) {
  if (value >= 100) return Math.round(value).toLocaleString("en-US");
  if (value >= 10) return round1(value).toString();
  return (Math.round(value * 100) / 100).toString();
}

function microDailyPercent(micro: FoodMicronutrient) {
  const dailyValue = MICRO_DAILY_VALUES[micro.key] || 0;
  return dailyValue ? Math.round((micro.value / dailyValue) * 100) : 0;
}

function calculateMealComponents(components: FuelMealComponent[]) {
  const totals = emptyTotals();
  const microTotals = new Map<string, FoodMicronutrient>();
  let grams = 0;
  components.forEach((component) => {
    const safeGrams = Math.max(1, component.grams || 1);
    const ratio = safeGrams / 100;
    grams += safeGrams;
    totals.calories += component.food.calories * ratio;
    totals.protein += component.food.protein * ratio;
    totals.carbs += component.food.carbs * ratio;
    totals.fat += component.food.fat * ratio;
    component.food.micronutrients?.forEach((micro) => {
      const current = microTotals.get(micro.key);
      microTotals.set(micro.key, { ...micro, value: (current?.value || 0) + micro.value * ratio });
    });
  });
  return {
    grams: round1(grams),
    calories: round1(totals.calories),
    protein: round1(totals.protein),
    carbs: round1(totals.carbs),
    fat: round1(totals.fat),
    micronutrients: [...microTotals.values()].map((micro) => ({ ...micro, value: Math.round(micro.value * 100) / 100 })),
  };
}

function fallbackInsights(days: Array<{ totals: NutrientTotals }>, targets: FuelTargets) {
  const recorded = days.filter((day) => day.totals.calories > 0);
  if (!recorded.length) return [
    "Log at least one complete day so the weekly menu can identify a useful pattern.",
    "Build each main meal around a clear protein source, then add produce and a measured energy source.",
    "Use gram weights for repeat foods to make weekly comparisons more consistent.",
  ];
  const average = recorded.reduce((sum, day) => sum + day.totals.calories, 0) / recorded.length;
  const lowProtein = recorded.filter((day) => day.totals.protein < targets.protein * .9).length;
  const onTarget = recorded.filter((day) => Math.abs(day.totals.calories - targets.calories) <= targets.calories * .1).length;
  return [
    average > targets.calories * 1.1
      ? `Average intake was ${Math.round(average - targets.calories)} kcal above target; reduce one repeat portion rather than skipping a whole meal.`
      : average < targets.calories * .9
        ? `Average intake was ${Math.round(targets.calories - average)} kcal below target; add a planned balanced snack if the gap is unintentional.`
        : `Average calories stayed close to the ${targets.calories} kcal target; keep the same meal structure next week.`,
    lowProtein > 0
      ? `Protein was below 90% of target on ${lowProtein} logged day${lowProtein === 1 ? "" : "s"}; spread protein across the five meal courses.`
      : "Protein reached at least 90% of target on every logged day; keep portions consistent.",
    `${onTarget} of ${recorded.length} logged days were within 10% of the calorie target. Pre-plan the course that varies most to improve consistency.`,
  ];
}

function makeSimplePdf(lines: string[]) {
  const safe = (value: string) => value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "").replace(/([\\()])/g, "\\$1");
  const visible = lines.slice(0, 43);
  const commands = visible.map((line, index) => `BT /${index === 0 ? "F2" : "F1"} ${index === 0 ? 20 : 10} Tf 54 ${752 - index * 16} Td (${safe(line)}) Tj ET`).join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >> endobj",
    `4 0 obj << /Length ${commands.length} >> stream\n${commands}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >> endobj",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => { offsets.push(pdf.length); pdf += `${object}\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function FoodLog({ state, savedFoods, onStateChange, onSaveFood, onRemoveSavedFood }: Props) {
  const today = dateKey();
  const startDate = state.startDate || today;
  const [view, setView] = useState<FuelView>("today");
  const [selectedDate, setSelectedDate] = useState(startDate);
  const [serviceWeek, setServiceWeek] = useState(0);
  const [selectedMealId, setSelectedMealId] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UsdaFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [portionQuantity, setPortionQuantity] = useState("100");
  const [portionUnit, setPortionUnit] = useState<PortionUnit>("g");
  const [gramsPerUnit, setGramsPerUnit] = useState("100");
  const [manual, setManual] = useState<ManualForm>(emptyManual);
  const [mealComponentSearch, setMealComponentSearch] = useState("");
  const [mealComponentResults, setMealComponentResults] = useState<UsdaFood[]>([]);
  const [mealComponentLoading, setMealComponentLoading] = useState(false);
  const [mealComponentError, setMealComponentError] = useState("");
  const [mealComponents, setMealComponents] = useState<FuelMealComponent[]>([]);
  const [componentEditor, setComponentEditor] = useState<{ mealId: string; foodId: string; name: string } | null>(null);
  const [editorComponents, setEditorComponents] = useState<FuelMealComponent[]>([]);
  const [editorComponentSearch, setEditorComponentSearch] = useState("");
  const [editorComponentResults, setEditorComponentResults] = useState<UsdaFood[]>([]);
  const [editorComponentLoading, setEditorComponentLoading] = useState(false);
  const [editorComponentError, setEditorComponentError] = useState("");
  const [alternativeFood, setAlternativeFood] = useState<{ mealId: string; food: FuelFoodItem } | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [alternativeHelp, setAlternativeHelp] = useState<string[]>([]);
  const [alternativesLoading, setAlternativesLoading] = useState(false);
  const [alternativeError, setAlternativeError] = useState("");
  const [weeklyInsights, setWeeklyInsights] = useState<string[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsLive, setInsightsLive] = useState(false);

  useEffect(() => { setSelectedDate(startDate); }, [startDate]);

  const dayNumber = Math.max(1, dateDistance(startDate, selectedDate) + 1);
  const daysUntilOpening = dateDistance(today, startDate);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startDate, serviceWeek * 7 + index)), [startDate, serviceWeek]);
  const activeDay = state.days.find((day) => day.date === selectedDate);
  const activeMeals = ensureFiveMeals(activeDay, selectedDate).meals;
  const activeMealId = activeMeals.some((meal) => meal.id === selectedMealId) ? selectedMealId : activeMeals[0]?.id || "";
  const activeTotals = useMemo(() => sumFoods(dayFoods(activeDay)), [activeDay]);
  const activeMicronutrients = useMemo(() => {
    const totals = new Map<string, FoodMicronutrient>();
    dayFoods(activeDay).forEach((food) => food.micronutrients?.forEach((micro) => {
      const current = totals.get(micro.key);
      totals.set(micro.key, { ...micro, value: (current?.value || 0) + micro.value });
    }));
    return [...totals.values()].map<DailyMicro>((micro) => {
      const dailyValue = MICRO_DAILY_VALUES[micro.key] || 0;
      return { ...micro, dailyValue, percent: dailyValue ? Math.round((micro.value / dailyValue) * 100) : 0 };
    }).filter((micro) => micro.dailyValue > 0).sort((a, b) => b.percent - a.percent);
  }, [activeDay]);
  const caloriePercent = Math.min(100, (activeTotals.calories / Math.max(state.targets.calories, 1)) * 100);
  const calorieDifference = state.targets.calories - activeTotals.calories;
  const manualCalories = round1((Number(manual.protein) || 0) * 4 + (Number(manual.carbs) || 0) * 4 + (Number(manual.fat) || 0) * 9);
  const mealComponentTotals = useMemo(() => calculateMealComponents(mealComponents), [mealComponents]);
  const editorComponentTotals = useMemo(() => calculateMealComponents(editorComponents), [editorComponents]);
  const week = useMemo(() => weekDates.map((date) => ({
    date,
    totals: sumFoods(dayFoods(state.days.find((day) => day.date === date))),
    meals: state.days.find((day) => day.date === date)?.meals ?? [],
  })), [state.days, weekDates]);
  const weeklyStats = useMemo(() => {
    const recorded = week.filter((day) => day.totals.calories > 0);
    const average = (key: keyof NutrientTotals) => recorded.length ? recorded.reduce((sum, day) => sum + day.totals[key], 0) / recorded.length : 0;
    const adherenceDays = recorded.filter((day) => Math.abs(day.totals.calories - state.targets.calories) <= state.targets.calories * .1).length;
    const foodCounts = new Map<string, number>();
    const mealCounts = new Map<string, number>();
    week.forEach((day) => day.meals.forEach((meal) => {
      mealCounts.set(meal.name, (mealCounts.get(meal.name) || 0) + 1);
      meal.foods.forEach((food) => foodCounts.set(food.name, (foodCounts.get(food.name) || 0) + 1));
    }));
    const top = (counts: Map<string, number>) => [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      recordedDays: recorded.length,
      averageCalories: average("calories"), averageProtein: average("protein"), averageCarbs: average("carbs"), averageFat: average("fat"),
      adherenceScore: recorded.length ? Math.round((adherenceDays / recorded.length) * 100) : 0,
      mostLoggedFood: top(foodCounts), mostLoggedMeal: top(mealCounts),
    };
  }, [week, state.targets.calories]);
  const fallbackWeeklyInsights = useMemo(() => fallbackInsights(week, state.targets), [week, state.targets]);
  const reportSignature = week.map((day) => `${day.date}:${day.totals.calories}:${day.totals.protein}`).join("|");

  const mutateDay = (date: string, mutate: (day: FuelDay) => FuelDay) => {
    const existing = ensureFiveMeals(state.days.find((day) => day.date === date), date);
    const nextDay = mutate(existing);
    const days = [...state.days.filter((day) => day.date !== date), nextDay].sort((a, b) => a.date.localeCompare(b.date));
    onStateChange({ ...state, startDate, days });
  };

  const addFoodToMeal = (food: FuelFoodItem) => {
    if (!activeMealId) return;
    mutateDay(selectedDate, (day) => ({ ...day, meals: day.meals.map((meal) => meal.id === activeMealId ? { ...meal, foods: [...meal.foods, food] } : meal) }));
    setView("today");
  };

  const removeFood = (mealId: string, foodId: string) => mutateDay(selectedDate, (day) => ({ ...day, meals: day.meals.map((meal) => meal.id === mealId ? { ...meal, foods: meal.foods.filter((food) => food.id !== foodId) } : meal) }));
  const changeFoodGrams = (mealId: string, foodId: string, grams: number) => mutateDay(selectedDate, (day) => ({ ...day, meals: day.meals.map((meal) => meal.id === mealId ? { ...meal, foods: meal.foods.map((food) => food.id === foodId ? updateFoodWeight(food, grams) : food) } : meal) }));
  const changeFoodServings = (mealId: string, foodId: string, servings: number) => mutateDay(selectedDate, (day) => ({ ...day, meals: day.meals.map((meal) => meal.id === mealId ? { ...meal, foods: meal.foods.map((food) => food.id === foodId ? updateFoodServings(food, servings) : food) } : meal) }));

  const shiftMenuSchedule = (count: number) => {
    if (!count) return;
    const nextStartDate = addDays(startDate, count);
    const nextDays = state.days.map((day) => ({ ...day, date: addDays(day.date, count) })).sort((a, b) => a.date.localeCompare(b.date));
    onStateChange({ ...state, startDate: nextStartDate, days: nextDays, scheduleVersion: 2 });
    setSelectedDate((date) => addDays(date, count));
  };

  const startMenuToday = () => {
    setServiceWeek(0);
    shiftMenuSchedule(dateDistance(startDate, today));
    setSelectedDate(today);
  };

  const openDay = (date: string) => {
    setSelectedDate(date);
    setSelectedMealId("");
    setView("today");
  };

  const searchUsda = async (event: FormEvent) => {
    event.preventDefault();
    if (search.trim().length < 2) return;
    setSearching(true);
    setSearchError("");
    try {
      const response = await fetch(`/api/usda?q=${encodeURIComponent(search.trim())}`);
      const data = await response.json() as { foods?: UsdaFood[]; error?: string; notice?: string; source?: string };
      if (!response.ok) throw new Error(data.error || "USDA search failed.");
      setResults((data.foods ?? []).map((food) => ({ ...food, source: food.source || data.source || "USDA FoodData Central" })));
      if (!(data.foods ?? []).length) setSearchError(data.notice || "No matching USDA foods found.");
    } catch (error) {
      setResults([]);
      setSearchError(error instanceof Error ? error.message : "USDA search failed.");
    } finally {
      setSearching(false);
    }
  };

  const addUsdaFood = (food: UsdaFood) => {
    addFoodToMeal(food.nutritionBasis === "perServing"
      ? scaleFromServing(food, 1)
      : scaleFromPer100(food, Number(portionQuantity), portionUnit, Number(gramsPerUnit)));
    onSaveFood({ ...food, source: food.source || "USDA FoodData Central" });
  };

  const searchMealComponents = async () => {
    if (mealComponentSearch.trim().length < 2) {
      setMealComponentError("Enter at least two letters to search USDA ingredients.");
      return;
    }
    setMealComponentLoading(true);
    setMealComponentError("");
    try {
      const response = await fetch(`/api/usda?q=${encodeURIComponent(mealComponentSearch.trim())}`);
      const data = await response.json() as { foods?: UsdaFood[]; error?: string; notice?: string; source?: string };
      if (!response.ok) throw new Error(data.error || "USDA ingredient search failed.");
      setMealComponentResults((data.foods ?? []).map((food) => ({ ...food, source: food.source || data.source || "USDA FoodData Central" })));
      if (!(data.foods ?? []).length) setMealComponentError(data.notice || "No USDA ingredients found.");
    } catch (error) {
      setMealComponentResults([]);
      setMealComponentError(error instanceof Error ? error.message : "USDA ingredient search failed.");
    } finally {
      setMealComponentLoading(false);
    }
  };

  const addMealComponent = (food: UsdaFood) => {
    setMealComponents((components) => [...components, { id: uid("ingredient"), food, grams: 100 }]);
    setMealComponentResults([]);
    setMealComponentSearch("");
    setMealComponentError("");
  };

  const changeMealComponentGrams = (id: string, grams: number) => {
    const safeGrams = Math.max(1, Math.min(5000, Number(grams) || 1));
    setMealComponents((components) => components.map((component) => component.id === id ? { ...component, grams: safeGrams } : component));
  };

  const removeMealComponent = (id: string) => setMealComponents((components) => components.filter((component) => component.id !== id));

  const openComponentEditor = (mealId: string, food: FuelFoodItem) => {
    setComponentEditor({ mealId, foodId: food.id, name: food.name });
    setEditorComponents((food.components ?? []).map((component) => ({ ...component, food: { ...component.food } })));
    setEditorComponentSearch("");
    setEditorComponentResults([]);
    setEditorComponentError("");
  };

  const searchEditorComponents = async () => {
    if (editorComponentSearch.trim().length < 2) {
      setEditorComponentError("Enter at least two letters to search USDA ingredients.");
      return;
    }
    setEditorComponentLoading(true);
    setEditorComponentError("");
    try {
      const response = await fetch(`/api/usda?q=${encodeURIComponent(editorComponentSearch.trim())}`);
      const data = await response.json() as { foods?: UsdaFood[]; error?: string; notice?: string; source?: string };
      if (!response.ok) throw new Error(data.error || "USDA ingredient search failed.");
      setEditorComponentResults((data.foods ?? []).map((food) => ({ ...food, source: food.source || data.source || "USDA FoodData Central" })));
      if (!(data.foods ?? []).length) setEditorComponentError(data.notice || "No USDA ingredients found.");
    } catch (error) {
      setEditorComponentResults([]);
      setEditorComponentError(error instanceof Error ? error.message : "USDA ingredient search failed.");
    } finally {
      setEditorComponentLoading(false);
    }
  };

  const addEditorComponent = (food: UsdaFood) => {
    setEditorComponents((components) => [...components, { id: uid("ingredient"), food, grams: 100 }]);
    setEditorComponentResults([]);
    setEditorComponentSearch("");
    setEditorComponentError("");
  };

  const changeEditorComponentGrams = (id: string, grams: number) => {
    const safeGrams = Math.max(1, Math.min(5000, Number(grams) || 1));
    setEditorComponents((components) => components.map((component) => component.id === id ? { ...component, grams: safeGrams } : component));
  };

  const removeEditorComponent = (id: string) => setEditorComponents((components) => components.filter((component) => component.id !== id));

  const closeComponentEditor = () => {
    setComponentEditor(null);
    setEditorComponents([]);
    setEditorComponentResults([]);
    setEditorComponentSearch("");
    setEditorComponentError("");
  };

  const saveComponentEditor = () => {
    if (!componentEditor || !editorComponents.length || editorComponentTotals.grams <= 0 || editorComponentTotals.calories <= 0) return;
    const meal = state.days.find((day) => day.date === selectedDate)?.meals.find((item) => item.id === componentEditor.mealId);
    const currentFood = meal?.foods.find((food) => food.id === componentEditor.foodId);
    if (!currentFood) return;
    const components = editorComponents.map((component) => ({ ...component, food: { ...component.food } }));
    const updatedFood: FuelFoodItem = {
      ...currentFood,
      foodType: "Meal",
      foodGroup: "Mixed meal",
      source: "USDA Meal Builder",
      quantity: 1,
      unit: "serving",
      gramsPerUnit: editorComponentTotals.grams,
      quantityGrams: editorComponentTotals.grams,
      calories: editorComponentTotals.calories,
      protein: editorComponentTotals.protein,
      carbs: editorComponentTotals.carbs,
      fat: editorComponentTotals.fat,
      micronutrients: editorComponentTotals.micronutrients,
      components,
    };
    mutateDay(selectedDate, (day) => ({
      ...day,
      meals: day.meals.map((course) => course.id === componentEditor.mealId
        ? { ...course, foods: course.foods.map((food) => food.id === componentEditor.foodId ? updatedFood : food) }
        : course),
    }));
    const per100Ratio = 100 / editorComponentTotals.grams;
    onSaveFood({
      fdcId: currentFood.usdaFdcId ?? -Date.now(),
      name: currentFood.name,
      foodType: "Meal",
      foodGroup: "Mixed meal",
      calories: round1(editorComponentTotals.calories * per100Ratio),
      protein: round1(editorComponentTotals.protein * per100Ratio),
      carbs: round1(editorComponentTotals.carbs * per100Ratio),
      fat: round1(editorComponentTotals.fat * per100Ratio),
      micronutrients: editorComponentTotals.micronutrients.map((micro) => ({ ...micro, value: Math.round(micro.value * per100Ratio * 100) / 100 })),
      components,
      componentServingGrams: editorComponentTotals.grams,
      serving: `One USDA-built meal · ${editorComponentTotals.grams} g`,
      source: "USDA Meal Builder",
    });
    closeComponentEditor();
  };

  const addManualFood = (event: FormEvent) => {
    event.preventDefault();
    if (!manual.name.trim() || !activeMealId) return;
    if (manual.foodType === "Meal") {
      if (!mealComponents.length || mealComponentTotals.grams <= 0 || mealComponentTotals.calories <= 0) return;
      const per100Ratio = 100 / mealComponentTotals.grams;
      const meal: UsdaFood = {
        fdcId: -Date.now(),
        name: manual.name.trim(),
        foodType: "Meal",
        foodGroup: "Mixed meal",
        calories: round1(mealComponentTotals.calories * per100Ratio),
        protein: round1(mealComponentTotals.protein * per100Ratio),
        carbs: round1(mealComponentTotals.carbs * per100Ratio),
        fat: round1(mealComponentTotals.fat * per100Ratio),
        micronutrients: mealComponentTotals.micronutrients.map((micro) => ({ ...micro, value: Math.round(micro.value * per100Ratio * 100) / 100 })),
        components: mealComponents.map((component) => ({ ...component, food: { ...component.food } })),
        componentServingGrams: mealComponentTotals.grams,
        serving: `One USDA-built meal · ${mealComponentTotals.grams} g`,
        source: "USDA Meal Builder",
      };
      addFoodToMeal(scaleFromPer100(meal, 1, "serving", mealComponentTotals.grams));
      onSaveFood(meal);
      setManual(emptyManual());
      setMealComponents([]);
      setMealComponentResults([]);
      setMealComponentSearch("");
      return;
    }
    if (manualCalories <= 0) return;
    const food: UsdaFood = {
      fdcId: -Date.now(), name: manual.name.trim(), foodType: manual.foodType, foodGroup: manual.foodGroup,
      calories: manualCalories, protein: Number(manual.protein) || 0, carbs: Number(manual.carbs) || 0, fat: Number(manual.fat) || 0,
      serving: "Manual nutrition per serving", source: "Manual Joelix", nutritionBasis: "perServing",
    };
    addFoodToMeal(scaleFromServing(food, Number(manual.servings)));
    onSaveFood(food);
    setManual(emptyManual());
  };

  const openAlternatives = async (mealId: string, food: FuelFoodItem) => {
    setAlternativeFood({ mealId, food });
    setAlternatives([]);
    setAlternativeHelp([]);
    setAlternativeError("");
    setAlternativesLoading(true);
    try {
      const response = await fetch("/api/food-alternatives", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: food.name, foodGroup: food.foodGroup, quantityGrams: food.quantityGrams, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat }),
      });
      const data = await response.json() as { alternatives?: Alternative[]; help?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Alternatives are unavailable.");
      setAlternatives((data.alternatives ?? []).filter((alternative) => alternative.matchPercent >= 80));
      setAlternativeHelp(data.help ?? []);
    } catch (error) {
      setAlternativeError(error instanceof Error ? error.message : "Alternatives are unavailable.");
    } finally {
      setAlternativesLoading(false);
    }
  };

  const useAlternative = (alternative: Alternative) => {
    if (!alternativeFood) return;
    const replacement: FuelFoodItem = {
      id: uid("swap"), name: alternative.name, source: alternative.source, foodType: "USDA alternative", foodGroup: alternative.category,
      quantity: alternative.quantityGrams, unit: "g", gramsPerUnit: 1, quantityGrams: alternative.quantityGrams,
      calories: alternative.calories, protein: alternative.protein, carbs: alternative.carbs, fat: alternative.fat,
    };
    mutateDay(selectedDate, (day) => ({ ...day, meals: day.meals.map((meal) => meal.id === alternativeFood.mealId ? { ...meal, foods: meal.foods.map((food) => food.id === alternativeFood.food.id ? replacement : food) } : meal) }));
    setAlternativeFood(null);
  };

  useEffect(() => {
    if (view !== "report") return;
    let active = true;
    setInsightsLoading(true);
    fetch("/api/fuel-insights", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targets: state.targets, days: week.map((day) => ({ date: day.date, ...day.totals })) }),
    }).then(async (response) => {
      const data = await response.json() as { suggestions?: string[]; live?: boolean };
      if (active) {
        setWeeklyInsights(data.suggestions?.length ? data.suggestions : fallbackWeeklyInsights);
        setInsightsLive(Boolean(data.live));
      }
    }).catch(() => { if (active) setWeeklyInsights(fallbackWeeklyInsights); })
      .finally(() => { if (active) setInsightsLoading(false); });
    return () => { active = false; };
  }, [view, reportSignature]);

  const updateTargets = (patch: Partial<FuelTargets>) => onStateChange({ ...state, startDate, targets: { ...state.targets, ...patch } });

  const downloadWeeklyReport = () => {
    const lines = [
      "JOELIX FUEL - SEVEN DAY MENU REPORT", `${displayDate(weekDates[0])} to ${displayDate(weekDates[6])}`, "",
      `Daily target: ${state.targets.calories} kcal | P ${state.targets.protein}g | C ${state.targets.carbs}g | F ${state.targets.fat}g`,
      `Logged days: ${weeklyStats.recordedDays}/7 | Average: ${Math.round(weeklyStats.averageCalories)} kcal | Adherence: ${weeklyStats.adherenceScore}%`,
      `Average macros: Protein ${Math.round(weeklyStats.averageProtein)}g | Carbs ${Math.round(weeklyStats.averageCarbs)}g | Fat ${Math.round(weeklyStats.averageFat)}g`,
      `Most logged food: ${weeklyStats.mostLoggedFood ? `${weeklyStats.mostLoggedFood[0]} (${weeklyStats.mostLoggedFood[1]})` : "None"}`,
      `Most logged meal: ${weeklyStats.mostLoggedMeal ? `${weeklyStats.mostLoggedMeal[0]} (${weeklyStats.mostLoggedMeal[1]})` : "None"}`, "", "DAILY SERVICE",
      ...week.map((day) => `${displayDate(day.date)}  ${Math.round(day.totals.calories)} kcal  P ${Math.round(day.totals.protein)}g  C ${Math.round(day.totals.carbs)}g  F ${Math.round(day.totals.fat)}g`),
      "", "CHEF'S NOTES", ...(weeklyInsights.length ? weeklyInsights : fallbackWeeklyInsights).map((tip, index) => `${index + 1}. ${tip}`), "",
      "Nutrition education only. USDA and manual values may vary by preparation and brand.",
    ];
    const url = URL.createObjectURL(makeSimplePdf(lines));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `joelix-fuel-${weekDates[0]}-${weekDates[6]}.pdf`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const macroCards = [
    { key: "protein", label: "Protein", value: activeTotals.protein, goal: state.targets.protein },
    { key: "carbs", label: "Carbohydrate", value: activeTotals.carbs, goal: state.targets.carbs },
    { key: "fat", label: "Fat", value: activeTotals.fat, goal: state.targets.fat },
  ];

  return (
    <div className="screen fine-fuel">
      <header className="fine-fuel-hero">
        <div><span>JOELIX · NUTRITION RESTAURANT</span><h1>The Fuel Dining Room</h1><p>A private seven-day menu for precise calories, macros, meals, and products.</p></div>
        <div className="fine-fuel-date"><small>First reservation</small><strong>{displayDate(startDate, true)}</strong><span>{daysUntilOpening > 0 ? `Day 1 opens ${daysUntilOpening === 1 ? "tomorrow" : `in ${daysUntilOpening} days`}` : "Service is now open"}</span></div>
      </header>

      <nav className="fine-fuel-tabs" aria-label="Fuel sections">
        {(["today", "entry", "history", "report"] as FuelView[]).map((tab) => <button key={tab} className={view === tab ? "active" : ""} onClick={() => { setView(tab); if (tab === "today") setSelectedDate(weekDates[0]); }}>{tab === "today" ? "Daily menus" : tab === "entry" ? "Kitchen order" : tab === "report" ? "Weekly report" : "Reservation book"}</button>)}
      </nav>

      <section className="fine-day-pages" aria-label="Daily menu pages">
        <header><div><span>YOUR MOVABLE RESERVATION BOOK</span><strong>Week {serviceWeek + 1} · starts {displayDate(startDate)}</strong></div><div className="fine-day-page-actions"><div className="fine-schedule-shifter"><button onClick={() => shiftMenuSchedule(-1)} aria-label="Shift all menu days backward one day">← Back 1 day</button><button className="today" onClick={startMenuToday} disabled={startDate === today}>Start today</button><button onClick={() => shiftMenuSchedule(1)} aria-label="Shift all menu days forward one day">Forward 1 day →</button></div><div className="fine-week-shifter"><button disabled={serviceWeek === 0} onClick={() => setServiceWeek((weekNumber) => Math.max(0, weekNumber - 1))}>Previous 7 days</button><button onClick={() => setServiceWeek((weekNumber) => weekNumber + 1)}>Next 7 days</button></div></div></header>
        <div>{weekDates.map((date, index) => { const totals = sumFoods(dayFoods(state.days.find((day) => day.date === date))); const number = serviceWeek * 7 + index + 1; const openingLabel = daysUntilOpening === 1 ? "Starts tomorrow" : daysUntilOpening > 1 ? `Starts in ${daysUntilOpening} days` : "Opening day"; return <button key={date} className={selectedDate === date ? "active" : ""} onClick={() => openDay(date)}><small>DAY {number}</small><strong>{displayDate(date)}</strong><span>{date === startDate ? openingLabel : totals.calories ? `${Math.round(totals.calories)} kcal logged` : "5-course menu"}</span></button>; })}</div>
      </section>

      {view === "today" && <>
        {daysUntilOpening > 0 && selectedDate === startDate && <section className="fine-opening-banner"><span>RESERVATION CONFIRMED</span><h2>Day 1 starts tomorrow.</h2><p>You can prepare the five courses now. Calories will belong to tomorrow, not today.</p></section>}
        <section className="fine-daily-header">
          <div><span>DAY {dayNumber} · FIVE-COURSE MENU</span><h2>{displayDate(selectedDate, true)}</h2></div>
          <div className="fine-calorie-score" style={{ "--fuel-progress": `${caloriePercent * 3.6}deg` } as CSSProperties}><strong>{Math.round(activeTotals.calories).toLocaleString("en-US")}</strong><span>/ {state.targets.calories.toLocaleString("en-US")} kcal</span><small>{calorieDifference >= 0 ? `${Math.round(calorieDifference)} remaining` : `${Math.abs(Math.round(calorieDifference))} over target`}</small></div>
        </section>
        <section className="fine-progress" aria-label={`${Math.round(caloriePercent)} percent of daily calorie target`}><i style={{ width: `${caloriePercent}%` }} /></section>
        <section className="fine-macro-grid">{macroCards.map((macro) => <article key={macro.key}><small>{macro.label}</small><strong>{Math.round(macro.value)}<em>g</em></strong><span>{Math.round((macro.value / Math.max(macro.goal, 1)) * 100)}% of {macro.goal}g</span><i><b style={{ width: `${Math.min(100, (macro.value / Math.max(macro.goal, 1)) * 100)}%` }} /></i></article>)}</section>

        <section className="fine-micro-dashboard">
          <header><div><span>VITAMINS &amp; MINERALS</span><h2>Daily micronutrients</h2></div><small>Percent of standard adult Daily Value</small></header>
          {activeMicronutrients.length ? <div>{activeMicronutrients.map((micro) => <article key={micro.key}><span aria-hidden="true">{micro.label.replace("Vitamin ", "").slice(0, 2)}</span><div><small>{micro.label}</small><strong>{formatMicro(micro.value)} {micro.unit}</strong></div><b>{micro.percent}% DV</b><i><em style={{ width: `${Math.min(100, micro.percent)}%` }} /></i></article>)}</div> : <p>Add a USDA food to see its vitamins, minerals, amounts, and daily intake percentages here.</p>}
          <footer>Daily Values are general adult reference values used for nutrition labeling, not personal medical targets.</footer>
        </section>

        <section className="fine-meal-service">
          <div className="fine-section-heading"><div><span>01 · THE FIVE COURSES</span><h2>Today&apos;s service</h2></div><button onClick={() => setView("entry")}>Order food</button></div>
          <div className="fine-meal-list">{activeMeals.map((meal, mealIndex) => { const totals = sumFoods(meal.foods); return <article className="fine-meal" key={meal.id}>
            <header><span>{String(mealIndex + 1).padStart(2, "0")}</span><div><h3>{meal.name}</h3><small>{meal.foods.length} item{meal.foods.length === 1 ? "" : "s"} · course {mealIndex + 1} of 5</small></div><div className="fine-meal-totals"><strong>{Math.round(totals.calories)} kcal</strong><small><b>P</b> {round1(totals.protein)}g <b>C</b> {round1(totals.carbs)}g <b>F</b> {round1(totals.fat)}g</small></div></header>
            {!meal.foods.length && <p className="fine-meal-empty">This plate is ready for your selection.</p>}
            {meal.foods.map((food) => <div className="fine-food-row" key={food.id}>
              <div><strong>{food.name}</strong><small>{food.foodGroup || "Other"} · {food.foodType || "Food"} · {food.source}</small></div>
              {food.nutritionBasis === "perServing" ? <label><span>Servings</span><input type="number" min="0.1" max="100" step="0.1" value={food.quantity} onChange={(event) => changeFoodServings(meal.id, food.id, Number(event.target.value))} /><b>serv.</b></label> : <label><span>Weight</span><input type="number" min="1" max="5000" value={food.quantityGrams} onChange={(event) => changeFoodGrams(meal.id, food.id, Number(event.target.value))} /><b>g</b></label>}
              <div className="fine-food-macros"><strong>{Math.round(food.calories)} kcal</strong><small>P {round1(food.protein)} · C {round1(food.carbs)} · F {round1(food.fat)}</small></div>
              <div className="fine-food-actions">{(food.foodType === "Meal" || food.source === "USDA Meal Builder") && <button className="fine-edit-components-button" onClick={() => openComponentEditor(meal.id, food)}>Edit components{food.components?.length ? ` · ${food.components.length}` : ""}</button>}<button className="fine-swap-button" onClick={() => void openAlternatives(meal.id, food)}>Find 80%+ swap</button></div>
              <button className="fine-remove-button" onClick={() => removeFood(meal.id, food.id)} aria-label={`Remove ${food.name}`}>×</button>
              {(food.foodType === "Meal" || food.source === "USDA Meal Builder") && <section className="fine-visible-components"><header><div><span>MEAL COMPONENTS</span><strong>{food.components?.length ? `${food.components.length} ingredients` : "No ingredient list saved"}</strong></div><button onClick={() => openComponentEditor(meal.id, food)}>{food.components?.length ? "Change ingredients" : "Add ingredients"}</button></header>{food.components?.length ? <div>{food.components.map((component) => { const ratio = component.grams / 100; return <article key={component.id}><div><strong>{component.food.name}</strong><small>{component.food.foodGroup || "USDA food"}</small></div><b>{component.grams} g</b><span>{Math.round(component.food.calories * ratio)} kcal</span><small>P {round1(component.food.protein * ratio)} · C {round1(component.food.carbs * ratio)} · F {round1(component.food.fat * ratio)}</small></article>; })}</div> : <p>This older mixed meal has only total nutrition saved. Select <b>Add ingredients</b> to rebuild and save its USDA components.</p>}</section>}
              {!!food.micronutrients?.length && <details className="fine-food-micros"><summary>Vitamins, minerals &amp; Daily Value</summary><div>{food.micronutrients.map((micro) => <span key={micro.key}><b>{micro.label}</b>{formatMicro(micro.value)} {micro.unit} · {microDailyPercent(micro)}% DV</span>)}</div></details>}
            </div>)}
            <button className="fine-add-course-item" onClick={() => { setSelectedMealId(meal.id); setView("entry"); }}>+ Add to {meal.name}</button>
          </article>; })}</div>
        </section>
      </>}

      {view === "entry" && <section className="fine-entry-layout">
        <div className="fine-entry-main">
          <div className="fine-section-heading"><div><span>02 · KITCHEN ORDER</span><h2>Add a meal or product</h2></div><small>Day {dayNumber} · {displayDate(selectedDate)}</small></div>
          <section className="fine-meal-picker"><label><span>Select one of five courses</span><select value={activeMealId} onChange={(event) => setSelectedMealId(event.target.value)}>{activeMeals.map((meal, index) => <option key={meal.id} value={meal.id}>{index + 1}. {meal.name}</option>)}</select></label><p>Every day is divided into a pre-workout meal, pre-workout snack, post-workout lunch, afternoon snack, and dinner.</p></section>
          <section className="fine-portion-control"><label><span>Quantity</span><input type="number" min="0.1" step="0.1" value={portionQuantity} onChange={(event) => setPortionQuantity(event.target.value)} /></label><label><span>Unit</span><select value={portionUnit} onChange={(event) => setPortionUnit(event.target.value as PortionUnit)}><option value="g">grams</option><option value="serving">serving</option><option value="piece">piece</option></select></label>{portionUnit !== "g" && <label><span>Grams per {portionUnit}</span><input type="number" min="1" value={gramsPerUnit} onChange={(event) => setGramsPerUnit(event.target.value)} /></label>}</section>
          <form className="fine-usda-search" onSubmit={searchUsda}><label><span>USDA FOODDATA CENTRAL · MACROS + MICROS</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chicken breast, rice, apple..." /></label><button disabled={searching}>{searching ? "Searching" : "Search menu"}</button></form>
          {searchError && <p className="fine-entry-warning">{searchError}</p>}
          <div className="fine-search-results">{results.map((food) => <article key={`${food.fdcId}-${food.name}`}><div><span>{food.foodGroup || "OTHER"} · {food.foodType || (food.brand ? "PRODUCT" : "USDA FOOD")} · {food.brand || "GENERIC"}</span><h3>{food.name}</h3><small>Per 100 g · USDA FDC {food.fdcId}</small></div><dl><div><dt>kcal</dt><dd>{food.calories}</dd></div><div><dt>protein</dt><dd>{food.protein}g</dd></div><div><dt>carbs</dt><dd>{food.carbs}g</dd></div><div><dt>fat</dt><dd>{food.fat}g</dd></div></dl><button onClick={() => addUsdaFood(food)}>Add portion</button>{!!food.micronutrients?.length && <details className="fine-usda-micros"><summary>View {food.micronutrients.length} vitamins, minerals &amp; Daily Values</summary><div>{food.micronutrients.map((micro) => <span key={micro.key}><b>{micro.label}</b>{formatMicro(micro.value)} {micro.unit} · {microDailyPercent(micro)}% DV</span>)}</div></details>}</article>)}</div>

          <details className="fine-manual-entry" open><summary>Manual meal or product</summary><form onSubmit={addManualFood}>
            <label><span>Name</span><input value={manual.name} onChange={(event) => setManual({ ...manual, name: event.target.value })} placeholder={manual.foodType === "Meal" ? "Chicken rice bowl" : "Product name"} required /></label>
            <label><span>Type</span><select value={manual.foodType} onChange={(event) => setManual({ ...manual, foodType: event.target.value as ManualForm["foodType"] })}><option value="Meal">Meal · build from USDA ingredients</option><option value="Product">Product · enter label macros</option></select></label>

            {manual.foodType === "Meal" ? <section className="fine-meal-builder">
              <header><div><span>USDA COMPONENT BUILDER</span><h3>Add every ingredient</h3></div><small>Ingredient grams control the complete meal calculation.</small></header>
              <div className="fine-component-search"><input value={mealComponentSearch} onChange={(event) => setMealComponentSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchMealComponents(); } }} placeholder="Search chicken, rice, broccoli..." aria-label="Search USDA meal ingredients" /><button type="button" onClick={() => void searchMealComponents()} disabled={mealComponentLoading}>{mealComponentLoading ? "Searching" : "Search USDA"}</button></div>
              {mealComponentError && <p className="fine-entry-warning">{mealComponentError}</p>}
              {!!mealComponentResults.length && <div className="fine-component-results">{mealComponentResults.slice(0, 6).map((food) => <article key={`${food.fdcId}-${food.name}`}><div><strong>{food.name}</strong><small>{food.foodGroup || "Other"} · per 100 g</small></div><span>{food.calories} kcal · P {food.protein} · C {food.carbs} · F {food.fat}</span><button type="button" onClick={() => addMealComponent(food)}>+ Component</button></article>)}</div>}
              <div className="fine-component-list">{mealComponents.map((component, index) => { const ratio = component.grams / 100; return <article key={component.id}><b>{String(index + 1).padStart(2, "0")}</b><div><strong>{component.food.name}</strong><small>{component.food.foodGroup || "Other"} · USDA FDC {component.food.fdcId}</small></div><label><span>Grams</span><input type="number" min="1" max="5000" value={component.grams} onChange={(event) => changeMealComponentGrams(component.id, Number(event.target.value))} /></label><p>{Math.round(component.food.calories * ratio)} kcal <small>P {round1(component.food.protein * ratio)} · C {round1(component.food.carbs * ratio)} · F {round1(component.food.fat * ratio)}</small></p><button type="button" onClick={() => removeMealComponent(component.id)} aria-label={`Remove ${component.food.name}`}>×</button></article>; })}</div>
              {!mealComponents.length && <p className="fine-component-empty">Search USDA and add the first component of your meal.</p>}
              <div className="fine-component-total"><span>USDA-CALCULATED MEAL</span><strong>{mealComponentTotals.calories} kcal</strong><div><b>{mealComponentTotals.grams}g</b> total weight <b>P {mealComponentTotals.protein}g</b><b>C {mealComponentTotals.carbs}g</b><b>F {mealComponentTotals.fat}g</b></div><small>{mealComponentTotals.micronutrients.length} vitamins and minerals included</small></div>
            </section> : <>
              <label><span>Food group for alternatives</span><select value={manual.foodGroup} onChange={(event) => setManual({ ...manual, foodGroup: event.target.value as FoodGroup })}>{FOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}</select></label>
              <label><span>Number of servings to add</span><input type="number" min="0.1" max="100" step="0.1" value={manual.servings} onChange={(event) => setManual({ ...manual, servings: event.target.value })} required /></label>
              {(["protein", "carbs", "fat"] as const).map((field) => <label key={field}><span>{field} g / serving</span><input type="number" min="0" step="0.1" value={manual[field]} onChange={(event) => setManual({ ...manual, [field]: event.target.value })} required /></label>)}
              <div className="fine-calorie-calculator"><span>CALCULATED PER SERVING</span><strong>{manualCalories} kcal</strong><small>Protein × 4 + carbs × 4 + fat × 9 · {Number(manual.servings) || 0} serving{Number(manual.servings) === 1 ? "" : "s"} = {round1(manualCalories * (Number(manual.servings) || 0))} kcal total</small></div>
            </>}
            <button disabled={manual.foodType === "Meal" ? !mealComponents.length || mealComponentTotals.calories <= 0 : manualCalories <= 0 || Number(manual.servings) <= 0}>{manual.foodType === "Meal" ? "Add USDA-calculated meal" : "Add serving-based product"}</button>
          </form></details>
        </div>
        <aside className="fine-saved-pantry"><span>SAVED JOELIX</span><h2>The pantry</h2><p>Your saved meals and products stay here for quick ordering.</p><div>{savedFoods.map((food) => <article key={`${food.fdcId}-${food.source}`}><div><strong>{food.name}</strong><small>{food.foodGroup || "Other"} · {food.foodType || "Food"} · {food.calories} kcal · P {food.protein} · C {food.carbs} · F {food.fat}</small>{food.foodType === "Meal" && <details className="fine-pantry-components"><summary>{food.components?.length ? `View ${food.components.length} meal components` : "Components not saved yet"}</summary>{food.components?.length ? <div>{food.components.map((component) => <span key={component.id}><b>{component.food.name}</b>{component.grams} g</span>)}</div> : <p>Add this meal to a course, then choose Edit components to build its ingredient list.</p>}</details>}</div><button onClick={() => addUsdaFood(food)}>Add</button><button onClick={() => onRemoveSavedFood(food.fdcId, food.source)} aria-label={`Remove ${food.name} from Saved Joelix`}>×</button></article>)}</div>{!savedFoods.length && <small>No saved foods yet. USDA foods you add will appear here.</small>}</aside>
      </section>}

      {view === "history" && <section className="fine-history"><div className="fine-section-heading"><div><span>03 · RESERVATION BOOK</span><h2>Daily menu pages</h2></div><small>35 service days from Day 1</small></div><div className="fine-calendar-head">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => <span key={day}>{day}</span>)}</div><div className="fine-calendar">{Array.from({ length: 35 }, (_, index) => addDays(startDate, index)).map((date, index) => { const totals = sumFoods(dayFoods(state.days.find((day) => day.date === date))); const difference = state.targets.calories - totals.calories; return <button key={date} className={`${date === selectedDate ? "today" : ""} ${totals.calories ? "logged" : ""}`} onClick={() => openDay(date)}><span>{index + 1}</span><strong>{displayDate(date)}</strong><small>{totals.calories ? `${Math.round(totals.calories)} kcal · ${difference >= 0 ? `${Math.round(difference)} under` : `${Math.abs(Math.round(difference))} over`}` : "Five courses waiting"}</small></button>; })}</div></section>}

      {view === "report" && <section className="fine-report"><div className="fine-section-heading"><div><span>04 · SEVEN-DAY REVIEW</span><h2>Weekly tasting report</h2></div><button onClick={downloadWeeklyReport}>Download PDF</button></div><div className="fine-report-summary"><article><small>Average service</small><strong>{Math.round(weeklyStats.averageCalories)}</strong><span>kcal / day</span></article><article><small>Adherence</small><strong>{weeklyStats.adherenceScore}%</strong><span>within 10% of target</span></article><article><small>Most logged food</small><strong>{weeklyStats.mostLoggedFood?.[0] || "—"}</strong><span>{weeklyStats.mostLoggedFood ? `${weeklyStats.mostLoggedFood[1]} appearances` : "No entries yet"}</span></article><article><small>Most logged meal</small><strong>{weeklyStats.mostLoggedMeal?.[0] || "—"}</strong><span>{weeklyStats.mostLoggedMeal ? `${weeklyStats.mostLoggedMeal[1]} services` : "No meals yet"}</span></article></div><section className="fine-target-settings"><div><span>DAILY TARGETS</span><p>Adjustments save automatically.</p></div>{(["calories", "protein", "carbs", "fat"] as const).map((target) => <label key={target}><span>{target}</span><input type="number" min="0" value={state.targets[target]} onChange={(event) => updateTargets({ [target]: Math.max(0, Number(event.target.value) || 0) })} /><small>{target === "calories" ? "kcal" : "g"}</small></label>)}</section><div className="fine-week-table"><div className="head"><span>Date</span><span>Calories</span><span>Protein</span><span>Carbs</span><span>Fat</span><span>Status</span></div>{week.map((day) => { const delta = day.totals.calories - state.targets.calories; return <div key={day.date}><strong>{displayDate(day.date)}</strong><span>{Math.round(day.totals.calories)}</span><span>{Math.round(day.totals.protein)}g</span><span>{Math.round(day.totals.carbs)}g</span><span>{Math.round(day.totals.fat)}g</span><small>{!day.totals.calories ? "Not logged" : Math.abs(delta) <= state.targets.calories * .1 ? "On target" : delta > 0 ? `${Math.round(delta)} over` : `${Math.abs(Math.round(delta))} under`}</small></div>; })}</div><section className="fine-ai-notes"><header><span>THE BEST · NUTRITION REVIEW</span><small>{insightsLoading ? "Reviewing the week…" : insightsLive ? "Live AI analysis" : "Evidence-based local analysis"}</small></header><ol>{(weeklyInsights.length ? weeklyInsights : fallbackWeeklyInsights).map((tip) => <li key={tip}>{tip}</li>)}</ol><p>General nutrition education only; not medical advice or a diagnosis.</p></section></section>}

      {componentEditor && <div className="fine-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeComponentEditor()}><section className="fine-component-editor" role="dialog" aria-modal="true" aria-labelledby="component-editor-title"><button className="fine-modal-close" onClick={closeComponentEditor} aria-label="Close component editor">×</button><span>USDA MEAL BUILDER · LIVE RECALCULATION</span><h2 id="component-editor-title">Edit {componentEditor.name}</h2><p>Change any ingredient weight, remove ingredients, or search USDA to add more. The complete meal updates when you save.</p>
        <div className="fine-component-search"><input value={editorComponentSearch} onChange={(event) => setEditorComponentSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchEditorComponents(); } }} placeholder="Add another ingredient from USDA..." aria-label="Search USDA ingredients to add" /><button type="button" onClick={() => void searchEditorComponents()} disabled={editorComponentLoading}>{editorComponentLoading ? "Searching" : "Search USDA"}</button></div>
        {editorComponentError && <p className="fine-entry-warning">{editorComponentError}</p>}
        {!!editorComponentResults.length && <div className="fine-component-results">{editorComponentResults.slice(0, 6).map((food) => <article key={`${food.fdcId}-${food.name}`}><div><strong>{food.name}</strong><small>{food.foodGroup || "Other"} · per 100 g</small></div><span>{food.calories} kcal · P {food.protein} · C {food.carbs} · F {food.fat}</span><button type="button" onClick={() => addEditorComponent(food)}>+ Add</button></article>)}</div>}
        <div className="fine-component-list">{editorComponents.map((component, index) => { const ratio = component.grams / 100; return <article key={component.id}><b>{String(index + 1).padStart(2, "0")}</b><div><strong>{component.food.name}</strong><small>{component.food.foodGroup || "Other"} · USDA FDC {component.food.fdcId}</small></div><label><span>Grams</span><input type="number" min="1" max="5000" value={component.grams} onChange={(event) => changeEditorComponentGrams(component.id, Number(event.target.value))} /></label><p>{Math.round(component.food.calories * ratio)} kcal <small>P {round1(component.food.protein * ratio)} · C {round1(component.food.carbs * ratio)} · F {round1(component.food.fat * ratio)}</small></p><button type="button" onClick={() => removeEditorComponent(component.id)} aria-label={`Remove ${component.food.name}`}>×</button></article>; })}</div>
        {!editorComponents.length && <p className="fine-component-empty">This meal needs at least one component. Search USDA above to add one.</p>}
        <div className="fine-component-total"><span>UPDATED MEAL</span><strong>{editorComponentTotals.calories} kcal</strong><div><b>{editorComponentTotals.grams}g</b> total weight <b>P {editorComponentTotals.protein}g</b><b>C {editorComponentTotals.carbs}g</b><b>F {editorComponentTotals.fat}g</b></div><small>{editorComponentTotals.micronutrients.length} vitamins and minerals recalculated</small></div>
        <footer><button type="button" onClick={closeComponentEditor}>Cancel</button><button type="button" onClick={saveComponentEditor} disabled={!editorComponents.length || editorComponentTotals.calories <= 0}>Save component changes</button></footer>
      </section></div>}

      {alternativeFood && <div className="fine-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setAlternativeFood(null)}><section className="fine-alternative-modal" role="dialog" aria-modal="true" aria-labelledby="swap-title"><button className="fine-modal-close" onClick={() => setAlternativeFood(null)} aria-label="Close alternatives">×</button><span>THE BEST · SAME-GROUP MACRO MATCH</span><h2 id="swap-title">{alternativeFood.food.foodGroup || "Same-type"} alternatives</h2><p>Replacing {alternativeFood.food.name}. Fruit stays with fruit, vegetables with vegetables, and every other food stays inside its own group. Only matches of 80% or higher appear.</p><aside className="fine-swap-help"><strong>How to choose a swap</strong><ol>{(alternativeHelp.length ? alternativeHelp : ["Every result is from the same food group.", "Check the macro differences before replacing your original.", "Use the exact gram amount for the closest match."]).map((tip) => <li key={tip}>{tip}</li>)}</ol></aside>{alternativesLoading && <div className="fine-swap-loading">Matching inside the {alternativeFood.food.foodGroup || "same"} group…</div>}{alternativeError && <p className="fine-entry-warning">{alternativeError}</p>}{!alternativesLoading && !alternativeError && !alternatives.length && <p className="fine-entry-warning">No honest 80% match was found inside this food group. Try a different portion size.</p>}<div className="fine-alternative-list">{alternatives.map((alternative, index) => <article key={`${alternative.name}-${alternative.quantityGrams}`}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{alternative.name}</h3><small>{alternative.category} · {alternative.source}</small></div><strong>{alternative.quantityGrams} g</strong><dl><div><dt>kcal</dt><dd>{alternative.calories}</dd></div><div><dt>P</dt><dd>{alternative.protein}g</dd></div><div><dt>C</dt><dd>{alternative.carbs}g</dd></div><div><dt>F</dt><dd>{alternative.fat}g</dd></div></dl><b>{alternative.matchPercent}% match</b><small className="fine-swap-delta">Δ {alternative.calorieDifference >= 0 ? "+" : ""}{alternative.calorieDifference} kcal · P {alternative.proteinDifference >= 0 ? "+" : ""}{alternative.proteinDifference} · C {alternative.carbsDifference >= 0 ? "+" : ""}{alternative.carbsDifference} · F {alternative.fatDifference >= 0 ? "+" : ""}{alternative.fatDifference}</small><button onClick={() => useAlternative(alternative)}>Use this swap</button></article>)}</div></section></div>}
    </div>
  );
}
