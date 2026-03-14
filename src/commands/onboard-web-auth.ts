/**
 * Web Model Auth Onboard
 *
 * Independent Web model authorization module
 * Supports authorizing multiple Web models simultaneously
 */

import type { WizardStep } from "../wizard/types.js";
import { loadConfig, writeConfigFile } from "../config/io.js";
import type { OpenClawConfig } from "../config/config.js";
import { resolveBrowserConfig, resolveProfile } from "../browser/config.js";
import { ensureAuthProfileStore, saveAuthProfileStore } from "../agents/auth-profiles.js";
import type { AuthProfileStore } from "../agents/auth-profiles/types.js";

// Import login functions for each web model
import { loginClaudeWeb } from "../providers/claude-web-auth.js";
import { loginChatGPTWeb } from "../providers/chatgpt-web-auth.js";
import { loginDeepseekWeb } from "../providers/deepseek-web-auth.js";
import { loginDoubaoWeb } from "../providers/doubao-web-auth.js";
import { loginGeminiWeb } from "../providers/gemini-web-auth.js";
import { loginZWeb } from "../providers/glm-web-auth.js";
import { loginGlmIntlWeb } from "../providers/glm-intl-web-auth.js";
import { loginGrokWeb } from "../providers/grok-web-auth.js";
import { loginKimiWeb } from "../providers/kimi-web-auth.js";
import { loginQwenWeb } from "../providers/qwen-web-auth.js";
import { loginQwenCNWeb } from "../providers/qwen-cn-web-auth.js";

// Web model credential saving helper function
async function saveWebModelCredentials(
  providerId: string,
  credentials: unknown
): Promise<void> {
  const store = ensureAuthProfileStore();
  const profileId = `${providerId}:default`;

  store.profiles[profileId] = {
    type: "token",
    provider: providerId,
    token: JSON.stringify(credentials),
  };

  saveAuthProfileStore(store);
  console.log(`  > Saved credentials to auth-profiles.json`);
}

// Web model whitelist update function
async function addModelToWhitelist(providerId: string, modelIds: string[]): Promise<void> {
  const config = loadConfig();

  // Initialize models field if it doesn't exist
  if (!config.agents.defaults.models) {
    config.agents.defaults.models = {};
  }

  // Model alias mapping
  const modelAliases: Record<string, Record<string, string>> = {
    "claude-web": {
      "claude-sonnet-4-6": "Claude Web",
      "claude-opus-4-6": "Claude Opus",
      "claude-haiku-4-6": "Claude Haiku",
    },
    "chatgpt-web": {
      "gpt-4": "ChatGPT Web",
    },
    "deepseek-web": {
      "deepseek-chat": "DeepSeek V3",
      "deepseek-reasoner": "DeepSeek R1",
    },
    "doubao-web": {
      "doubao-seed-2.0": "Doubao Browser",
    },
    "gemini-web": {
      "gemini-pro": "Gemini Pro",
      "gemini-ultra": "Gemini Ultra",
    },
    "glm-web": {
      "glm-4-plus": "GLM Web",
    },
    "glm-intl-web": {
      "glm-4-plus": "GLM-4 Plus (International)",
      "glm-4-think": "GLM-4 Think",
    },
    "grok-web": {
      "grok-2": "Grok Web",
    },
    "kimi-web": {
      "moonshot-v1-32k": "Kimi Web",
    },
    "qwen-web": {
      "qwen-max": "Qwen Web",
    },
    "qwen-cn-web": {
      "qwen-turbo": "Qwen CN Web",
    },
  };

  // Add models to whitelist
  for (const modelId of modelIds) {
    const modelKey = `${providerId}/${modelId}`;
    const alias = modelAliases[providerId]?.[modelId] || modelId;
    config.agents.defaults.models[modelKey] = { alias };
  }

  await writeConfigFile(config);
  console.log(`  > Updated model whitelist to openclaw.json`);
}

// Web model definitions
interface WebModelProvider {
  id: string;
  name: string;
  loginFn: (params: {
    onProgress: (msg: string) => void;
    openUrl: (url: string) => Promise<boolean>;
  }) => Promise<unknown>;
}

const WEB_MODEL_PROVIDERS: WebModelProvider[] = [
  { id: "claude-web", name: "Claude Web", loginFn: loginClaudeWeb },
  { id: "chatgpt-web", name: "ChatGPT Web", loginFn: loginChatGPTWeb },
  { id: "deepseek-web", name: "DeepSeek Web", loginFn: loginDeepseekWeb },
  { id: "doubao-web", name: "Doubao Web", loginFn: loginDoubaoWeb },
  { id: "gemini-web", name: "Gemini Web", loginFn: loginGeminiWeb },
  { id: "glm-web", name: "GLM Web (Domestic)", loginFn: loginZWeb },
  { id: "glm-intl-web", name: "GLM Web (International)", loginFn: loginGlmIntlWeb },
  { id: "grok-web", name: "Grok Web", loginFn: loginGrokWeb },
  { id: "kimi-web", name: "Kimi Web", loginFn: loginKimiWeb },
  { id: "qwen-web", name: "Qwen Web (Alibaba Domestic)", loginFn: loginQwenWeb },
  { id: "qwen-cn-web", name: "Qwen Web (Alibaba International)", loginFn: loginQwenCNWeb },
];

export async function runOnboardWebAuth(): Promise<void> {
  console.log("\n🦞 Web Model Auth Onboard\n");

  // Show authorized models
  const store = ensureAuthProfileStore();
  const authorizedModels = Object.keys(store.profiles).filter((key) =>
    key.endsWith("-web") || key.includes("-web:")
  );

  if (authorizedModels.length > 0) {
    console.log("Authorized Web models:");
    for (const model of authorizedModels) {
      console.log(`  - ${model}`);
    }
    console.log("");
  }

  // Select models to authorize
  console.log("Please select the Web models to authorize (separate multiple with commas):\n");

  for (let i = 0; i < WEB_MODEL_PROVIDERS.length; i++) {
    const provider = WEB_MODEL_PROVIDERS[i];
    const isAuthorized = authorizedModels.some((m) => m.startsWith(provider.id));
    const status = isAuthorized ? " ✓ Authorized" : "";
    console.log(`  ${i + 1}. ${provider.name}${status}`);
  }

  console.log("\n  0. Exit");
  console.log("  a. Authorize all models");
  console.log("");

  // Prompt user for input
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  const input = await question("Please enter an option: ");

  rl.close();

  if (input.trim() === "0" || input.trim() === "") {
    console.log("Exited.");
    return;
  }

  // Parse selected models
  let selectedProviders: WebModelProvider[] = [];

  if (input.trim() === "a") {
    selectedProviders = WEB_MODEL_PROVIDERS;
  } else {
    const indices = input.split(",").map((s) => parseInt(s.trim()) - 1);
    selectedProviders = indices
      .filter((i) => i >= 0 && i < WEB_MODEL_PROVIDERS.length)
      .map((i) => WEB_MODEL_PROVIDERS[i]);
  }

  if (selectedProviders.length === 0) {
    console.log("No models selected.");
    return;
  }

  console.log(`\nThe following models will be authorized: ${selectedProviders.map((p) => p.name).join(", ")}`);

  // List of model IDs corresponding to Web models
  const providerModelIds: Record<string, string[]> = {
    "claude-web": ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-6"],
    "chatgpt-web": ["gpt-4"],
    "deepseek-web": ["deepseek-chat", "deepseek-reasoner"],
    "doubao-web": ["doubao-seed-2.0"],
    "gemini-web": ["gemini-pro", "gemini-ultra"],
    "glm-web": ["glm-4-plus"],
    "glm-intl-web": ["glm-4-plus", "glm-4-think"],
    "grok-web": ["grok-2"],
    "kimi-web": ["moonshot-v1-32k"],
    "qwen-web": ["qwen-max"],
    "qwen-cn-web": ["qwen-turbo"],
  };

  // Authorize one by one
  for (const provider of selectedProviders) {
    console.log(`\nAuthorizing ${provider.name}...`);
    try {
      const result = await provider.loginFn({
        onProgress: (msg) => console.log(`  > ${msg}`),
        openUrl: async (url) => {
          console.log(`  > Opening browser: ${url}`);
          return true;
        },
      });

      // If credentials returned, save to auth-profiles.json
      if (result && typeof result === "object") {
        await saveWebModelCredentials(provider.id, result);
      }

      // Add models to whitelist
      const modelIds = providerModelIds[provider.id] || [];
      if (modelIds.length > 0) {
        await addModelToWhitelist(provider.id, modelIds);
      }

      console.log(`  ✓ ${provider.name} authorized successfully!`);
    } catch (error) {
      console.error(`  ✗ ${provider.name} authorization failed:`, error);
    }
  }

  console.log("\nAuthorization complete!");
  console.log("You can now use these models in the Web UI.");
}

// 注册为 CLI 命令
export const ONBOARD_WEB_AUTH_STEP: WizardStep = {
  title: "Web Model Auth",
  description: "Authorize Web AI models (Claude, ChatGPT, DeepSeek, etc.)",
  run: async () => {
    await runOnboardWebAuth();
  },
};
