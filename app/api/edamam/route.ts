type EdamamFood = {
  foodId?: string;
  label?: string;
  brand?: string;
  category?: string;
  nutrients?: {
    ENERC_KCAL?: number;
    PROCNT?: number;
    CHOCDF?: number;
    FAT?: number;
  };
};

type EdamamHint = {
  food?: EdamamFood;
};

function numericFoodId(value: string | undefined, index: number) {
  let hash = 2_166_136_261;
  for (const character of value || `edamam-${index}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return 7_000_000_000 + (hash >>> 0);
}

function safeNutrient(value: number | undefined, decimals = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(Math.max(0, number).toFixed(decimals)) : 0;
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return Response.json({ error: "Enter at least two letters." }, { status: 400 });
  }

  const appId = request.headers.get("x-edamam-app-id")?.trim() || process.env.EDAMAM_APP_ID?.trim();
  const appKey = request.headers.get("x-edamam-app-key")?.trim() || process.env.EDAMAM_APP_KEY?.trim();
  if (!appId || !appKey) {
    return Response.json({
      error: "Connect Edamam with a free App ID and App Key to search this source.",
      needsCredentials: true,
    }, { status: 401 });
  }

  const endpoint = new URL("https://api.edamam.com/api/food-database/v2/parser");
  endpoint.searchParams.set("app_id", appId);
  endpoint.searchParams.set("app_key", appKey);
  endpoint.searchParams.set("ingr", query);
  endpoint.searchParams.set("nutrition-type", "logging");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(endpoint, {
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = response.status === 401 || response.status === 403
        ? "Edamam rejected the App ID or App Key. Check both values and try again."
        : response.status === 429
          ? "Edamam search limit reached. Wait a moment and try again."
          : "Edamam nutrition search is temporarily unavailable.";
      return Response.json({ error, needsCredentials: response.status === 401 || response.status === 403 }, { status: response.status });
    }

    const payload = await response.json() as { hints?: EdamamHint[] };
    const foods = (payload.hints ?? []).slice(0, 12).map((hint, index) => {
      const food = hint.food ?? {};
      const nutrients = food.nutrients ?? {};
      return {
        fdcId: numericFoodId(food.foodId, index),
        name: food.label?.trim() || "Unnamed Edamam food",
        brand: food.brand?.trim() || food.category?.trim() || undefined,
        calories: Math.round(safeNutrient(nutrients.ENERC_KCAL)),
        protein: safeNutrient(nutrients.PROCNT),
        carbs: safeNutrient(nutrients.CHOCDF),
        fat: safeNutrient(nutrients.FAT),
        serving: "Edamam · Per 100 g",
        source: "Edamam Food Database",
      };
    }).filter((food) => food.calories > 0 || food.protein > 0 || food.carbs > 0 || food.fat > 0);

    return Response.json({
      foods,
      source: "Edamam Food Database",
      estimated: false,
      basisGrams: 100,
    });
  } catch {
    return Response.json({ error: "Edamam is temporarily unavailable. USDA and Saved Joelix still work." }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }
}
