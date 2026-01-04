/**
 * List of fast AI models recommended for semantic skill routing
 *
 * Models are dynamically selected from AI.Model enum based on naming patterns.
 * This ensures new fast models are automatically included.
 */

import { AI } from "@raycast/api";

export interface FastModel {
  /** The model ID used in AI.Model enum */
  id: string;
  /** Display name for the UI */
  name: string;
  /** Brief description of the model */
  description: string;
  /** Speed tier indicator */
  tier: "fastest" | "fast";
  /** Model provider */
  provider: "OpenAI" | "Google" | "Anthropic" | "Other";
}

/**
 * Keywords that indicate a model is optimized for speed
 */
const FAST_KEYWORDS = {
  // Highest priority - ultra-fast models
  fastest: ["flash", "lite", "haiku", "nano"],
  // Fast models
  fast: ["mini", "4o-mini", "o1-mini", "o3-mini", "o4-mini"],
};

/**
 * Get provider from model name
 */
function getProvider(modelName: string): FastModel["provider"] {
  const name = modelName.toLowerCase();

  if (name.includes("openai") || name.includes("gpt") || name.startsWith("o")) {
    return "OpenAI";
  }
  if (name.includes("google") || name.includes("gemini")) {
    return "Google";
  }
  if (name.includes("anthropic") || name.includes("claude")) {
    return "Anthropic";
  }
  return "Other";
}

/**
 * Generate description based on model characteristics
 */
function generateDescription(model: FastModel): string {
  const { name, tier } = model;

  if (tier === "fastest") {
    if (name.toLowerCase().includes("flash")) {
      return "Ultra-fast model optimized for agentic experiences and quick responses.";
    }
    if (name.toLowerCase().includes("haiku")) {
      return "Fastest Claude model with large context window for code and text analysis.";
    }
    if (name.toLowerCase().includes("nano")) {
      return "Compact and ultra-fast. Ideal for summarization and classification tasks.";
    }
    return "Ultra-fast model optimized for speed and efficiency.";
  }

  // Fast tier
  if (name.toLowerCase().includes("mini")) {
    return "Fast and intelligent model for everyday tasks. Great balance of speed and quality.";
  }
  return "Fast model optimized for efficient routing.";
}

/**
 * Determine speed tier based on model name
 */
function getSpeedTier(modelName: string): "fastest" | "fast" {
  const name = modelName.toLowerCase();

  // Check fastest tier keywords first
  for (const keyword of FAST_KEYWORDS.fastest) {
    if (name.includes(keyword)) {
      return "fastest";
    }
  }

  // Check fast tier keywords
  for (const keyword of FAST_KEYWORDS.fast) {
    if (name.includes(keyword)) {
      return "fast";
    }
  }

  // Default to fast if it has any speed-related keyword
  return "fast";
}

/**
 * Dynamically extract fast models from AI.Model enum
 */
export function getFastModels(): FastModel[] {
  const models: FastModel[] = [];

  // Get all models from the AI.Model enum
  for (const modelKey in AI.Model) {
    // Skip deprecated models (they have @deprecated comments in the type definition)
    if (
      modelKey.startsWith("Anthropic_Claude_3.7") ||
      modelKey.includes("3.5-turbo") ||
      modelKey.includes("GPT3.5") ||
      modelKey.includes("Llama2") ||
      (modelKey.includes("Llama3") && !modelKey.includes("3.1") && !modelKey.includes("3.3"))
    ) {
      continue;
    }

    // Check if model name contains fast keywords
    const hasFastKeyword =
      FAST_KEYWORDS.fastest.some((kw) => modelKey.toLowerCase().includes(kw)) ||
      FAST_KEYWORDS.fast.some((kw) => modelKey.toLowerCase().includes(kw));

    if (!hasFastKeyword) {
      continue;
    }

    const tier = getSpeedTier(modelKey);
    const provider = getProvider(modelKey);
    const name = modelKey.replace(/_/g, " ").replace(/(\d)/g, " $1").trim();

    const model: FastModel = {
      id: modelKey,
      name: name,
      description: "", // Temporary, will be set after
      tier,
      provider,
    };

    model.description = generateDescription(model);

    models.push(model);
  }

  return models;
}

/**
 * Cached list of fast models
 */
export const FAST_MODELS: FastModel[] = getFastModels();

/**
 * Get the default model for routing
 * Defaults to the newest Gemini Flash Lite model (our recommended fast model)
 */
export function getDefaultModel(): string {
  // Find all Gemini Flash Lite models
  const geminiFlashLiteModels = FAST_MODELS.filter((m) => m.id.includes("Gemini") && m.id.includes("Flash_Lite"));

  // Sort by version number to get the newest
  geminiFlashLiteModels.sort((a, b) => {
    // Extract version numbers (e.g., "2.5" from "Google_Gemini_2.5_Flash_Lite")
    const aVersion = a.id.match(/Gemini_(\d+\.\d+)_Flash_Lite/)?.[1] || "0";
    const bVersion = b.id.match(/Gemini_(\d+\.\d+)_Flash_Lite/)?.[1] || "0";
    return bVersion.localeCompare(aVersion, undefined, { numeric: true });
  });

  if (geminiFlashLiteModels.length > 0) {
    return geminiFlashLiteModels[0].id;
  }

  // Otherwise, return the first "fastest" tier model
  const fastestModel = FAST_MODELS.find((m) => m.tier === "fastest");
  if (fastestModel) {
    return fastestModel.id;
  }

  // Fallback to first available model
  return FAST_MODELS[0]?.id || "Google_Gemini_2.5_Flash_Lite";
}

/**
 * Get model metadata by ID
 */
export function getModelById(id: string): FastModel | undefined {
  return FAST_MODELS.find((model) => model.id === id);
}
