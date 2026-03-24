import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { getHeadersWithAuth } from "../browser/cdp.helpers.js";
import { getChromeWebSocketUrl, launchOpenClawChrome } from "../browser/chrome.js";
import { resolveBrowserConfig, resolveProfile } from "../browser/config.js";
import { loadConfig } from "../config/io.js";

export interface GeminiWebClientOptions {
  cookie: string;
  userAgent: string;
  headless?: boolean;
}

export class GeminiWebClientBrowser {
  private options: GeminiWebClientOptions;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private initialized = false;

  constructor(options: GeminiWebClientOptions) {
    this.options = options;
  }

  private parseCookies(): Array<{ name: string; value: string; domain: string; path: string }> {
    return this.options.cookie
      .split(";")
      .filter((c) => c.trim().includes("="))
      .map((cookie) => {
        const [name, ...valueParts] = cookie.trim().split("=");
        return {
          name: name?.trim() ?? "",
          value: valueParts.join("=").trim(),
          domain: ".google.com",
          path: "/",
        };
      })
      .filter((c) => c.name.length > 0);
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const rootConfig = loadConfig();
    const browserConfig = resolveBrowserConfig(rootConfig.browser, rootConfig);
    const profile = resolveProfile(browserConfig, browserConfig.defaultProfile);
    if (!profile) {
      throw new Error(`Could not resolve browser profile '${browserConfig.defaultProfile}'`);
    }

    let wsUrl: string | null = null;

    if (browserConfig.attachOnly) {
      console.log(`[Gemini Web Browser] Connecting to existing Chrome at ${profile.cdpUrl}`);
      for (let i = 0; i < 10; i++) {
        wsUrl = await getChromeWebSocketUrl(profile.cdpUrl, 2000);
        if (wsUrl) break;
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!wsUrl) {
        throw new Error(
          `Failed to connect to Chrome at ${profile.cdpUrl}. ` +
            `Make sure Chrome is running in debug mode (./start-chrome-debug.sh)`,
        );
      }
    } else {
      const running = await launchOpenClawChrome(browserConfig, profile);
      const cdpUrl = `http://127.0.0.1:${running.cdpPort}`;
      for (let i = 0; i < 10; i++) {
        wsUrl = await getChromeWebSocketUrl(cdpUrl, 2000);
        if (wsUrl) break;
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!wsUrl) {
        throw new Error(`Failed to resolve Chrome WebSocket URL from ${cdpUrl}`);
      }
    }

    const connectedBrowser = await chromium.connectOverCDP(wsUrl, {
      headers: getHeadersWithAuth(wsUrl),
    });
    this.browser = connectedBrowser;
    this.context = connectedBrowser.contexts()[0];

    const pages = this.context.pages();
    const geminiPage = pages.find((p) => p.url().includes("gemini.google.com"));
    if (geminiPage) {
      console.log(`[Gemini Web Browser] Found existing Gemini page`);
      this.page = geminiPage;
    } else {
      this.page = await this.context.newPage();
      await this.page.goto("https://gemini.google.com/app", { waitUntil: "domcontentloaded" });
    }

    const cookies = this.parseCookies();
    if (cookies.length > 0) {
      try {
        await this.context.addCookies(cookies);
      } catch (e) {
        console.warn("[Gemini Web Browser] Failed to add some cookies:", e);
      }
    }

    this.initialized = true;
  }

  /**
   * DOM Simulation: Sends messages via real browser interaction, bypassing Bard RPC protocol complexity
   */
  private async chatCompletionsViaDOM(params: {
    message: string;
    signal?: AbortSignal;
  }): Promise<ReadableStream<Uint8Array>> {
    if (!this.page) throw new Error("GeminiWebClientBrowser not initialized");

    const sent = await this.page.evaluate((msg: string) => {
      // Input box: Priority match Gemini placeholders, then generic selectors (reference Scrapling multi-strategy)
      const inputSelectors = [
        '[placeholder*="Gemini"]',
        '[placeholder*="Ask"]',
        '[data-placeholder*="Gemini"]',
        '[contenteditable="true"]',
        'div[role="textbox"]',
        "textarea",
        '[aria-label*="message"]',
        '[aria-label*="prompt"]',
      ];
      let inputEl: HTMLElement | null = null;
      for (const sel of inputSelectors) {
        const el = document.querySelector(sel);
        if (el && (el as HTMLElement).offsetParent !== null) {
          inputEl = el as HTMLElement;
          break;
        }
      }
      if (!inputEl) return { ok: false, error: "Input box not found" };

      inputEl.focus();
      if (inputEl.tagName === "TEXTAREA" || (inputEl as HTMLInputElement).tagName === "INPUT") {
        (inputEl as HTMLTextAreaElement).value = msg;
        (inputEl as HTMLTextAreaElement).dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        (inputEl as HTMLElement).innerText = msg;
        (inputEl as HTMLElement).dispatchEvent(new Event("input", { bubbles: true }));
        (inputEl as HTMLElement).dispatchEvent(new Event("change", { bubbles: true }));
      }

      const sendSelectors = [
        'button[aria-label*="Send"]',
        'button[aria-label*="send"]',
        'button[aria-label*="Submit"]',
        'button[aria-label*="Send"]',
        'button[type="submit"]',
        'button[data-icon="send"]',
        'button[data-testid*="send"]',
        "form button[type=submit]",
        'button[class*="send"]',
        '[aria-label*="Send message"]',
        ".send-button",
      ];
      let sendBtn: HTMLElement | null = null;
      for (const sel of sendSelectors) {
        sendBtn = document.querySelector(sel);
        if (sendBtn && !(sendBtn as HTMLButtonElement).disabled) break;
      }
      if (sendBtn) {
        (sendBtn as HTMLElement).click();
        return { ok: true };
      }
      const formSubmit = inputEl.closest("form")?.querySelector("button[type=submit]");
      if (formSubmit) {
        (formSubmit as HTMLElement).click();
        return { ok: true };
      }
      inputEl.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
        }),
      );
      return { ok: true };
    }, params.message);

    if (!sent.ok) {
      throw new Error(`Gemini DOM Simulation failed: ${sent.error}`);
    }

    console.log("[Gemini Web Browser] DOM simulation sent, polling for response...");

    const maxWaitMs = 120000;
    const pollIntervalMs = 2000;
    let lastText = "";
    let stableCount = 0;
    const signal = params.signal;

    for (let elapsed = 0; elapsed < maxWaitMs; elapsed += pollIntervalMs) {
      if (signal?.aborted) throw new Error("Gemini request cancelled");

      await new Promise((r) => setTimeout(r, pollIntervalMs));

      const result = await this.page.evaluate(() => {
        const clean = (t: string) => t.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

        // Exclude: Sidebar, greetings, suggestion buttons
        // Skip: "Ask Gemini", "Enter a prompt", "What can I do for you", "Start new conversation", etc.
        const skipTexts = [
          "Ask Gemini",
          "Enter a prompt",
          "What can I do for you",
          "Start new conversation",
          "My content",
          "Settings and help",
          "Create image",
          "Create music",
          "Help me study",
          "Write something",
          "Energize my day",
          "Upgrade to Google AI Plus",
          "Loading",
        ];
        const isGreeting = (t: string) =>
          /sage[,，]?\s*Hello/i.test(t) ||
          (t.includes("Hello") && (t.includes("need") || t.includes("do for you"))) ||
          /^What can I do for you/i.test(t);
        const isSkip = (t: string) =>
          skipTexts.some((s) => t.includes(s)) || isGreeting(t) || t.length < 20;

        const sidebarRoot = document.querySelector(
          '[aria-label*="Conversation"], [class*="sidebar"], nav',
        );
        const notInSidebar = (el: Element) => !sidebarRoot?.contains(el);

        // Exclude input area: input box and its parent container (including suggestion buttons)
        const inputEl = document.querySelector(
          '[contenteditable="true"], textarea, [placeholder*="Gemini"], [placeholder*="Ask"]',
        );
        const inputRoot =
          inputEl?.closest("form") ??
          inputEl?.closest("[class*='input']") ??
          inputEl?.parentElement?.parentElement;
        const notInInputArea = (el: Element) => !inputRoot?.contains(el);

        const main =
          document.querySelector("main") ??
          document.querySelector('[role="main"]') ??
          document.querySelector('[class*="chat"]') ??
          document.body;
        const scoped = main === document.body ? document : main;

        let text = "";
        const modelSelectors = [
          '[data-message-author="model"]',
          '[data-sender="model"]',
          '[class*="model-turn"]',
          '[class*="modelResponse"]',
          '[class*="assistant-message"]',
          '[class*="response-content"]',
          "article",
          "[class*='markdown']",
        ];
        for (const sel of modelSelectors) {
          const els = scoped.querySelectorAll(sel);
          for (let i = els.length - 1; i >= 0; i--) {
            const el = els[i];
            if (!notInSidebar(el) || !notInInputArea(el)) continue;
            const t = clean((el as HTMLElement).textContent ?? "");
            if (t.length >= 30 && !isSkip(t)) {
              text = t;
              break;
            }
          }
          if (text) break;
        }

        // Strategy 2: Get the last substantive content block in main area (excluding input area) by text length
        if (!text) {
          const candidates: Array<{ el: Element; text: string }> = [];
          scoped.querySelectorAll("p, div[class], li, span[class]").forEach((el) => {
            if (!notInSidebar(el) || !notInInputArea(el)) return;
            const t = clean((el as HTMLElement).textContent ?? "");
            if (t.length > 50 && !isSkip(t) && !candidates.some((c) => c.text === t)) {
              candidates.push({ el, text: t });
            }
          });
          if (candidates.length > 0) {
            text = candidates[candidates.length - 1].text;
          }
        }

        const stopBtn = document.querySelector('[aria-label*="Stop"], [aria-label*="stop"]');
        const isStreaming = !!stopBtn;
        return { text, isStreaming };
      });

      // Ignore contents that are too short (<40 chars are mostly greetings/buttons)
      const minLen = 40;
      if (result.text && result.text.length < minLen && result.text.length > 0) {
        console.log(
          `[Gemini Web Browser] Ignoring content that is too short (${result.text.length} chars): ${result.text.slice(0, 50)}...`,
        );
      }
      if (result.text && result.text.length >= minLen) {
        if (result.text !== lastText) {
          lastText = result.text;
          stableCount = 0;
        } else {
          stableCount++;
          if (!result.isStreaming && stableCount >= 2) {
            break;
          }
        }
      }
    }

    if (!lastText) {
      throw new Error(
        "Gemini DOM Simulation: No response detected. Please ensure gemini.google.com page is open, logged in, and the input box is visible.",
      );
    }

    // Output data: format parseable by gemini-web-stream
    const sseLine = `data: ${JSON.stringify({ text: lastText })}\n`;
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(sseLine));
        controller.close();
      },
    });
  }

  async chatCompletions(params: {
    conversationId?: string;
    message: string;
    model: string;
    signal?: AbortSignal;
  }): Promise<ReadableStream<Uint8Array>> {
    if (!this.page) {
      throw new Error("GeminiWebClientBrowser not initialized");
    }

    const { message } = params;
    console.log("[Gemini Web Browser] Using DOM simulation to send message...");

    return this.chatCompletionsViaDOM({
      message,
      signal: params.signal,
    });
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.initialized = false;
  }
}
