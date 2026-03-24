#!/bin/bash
# Start Chrome debug mode (for OpenClaw connection)
# Compatible with macOS / Linux (including Deepin) / Windows (Git Bash / WSL)
# Single instance: If a debug Chrome is already running, close it first then restart it

echo "=========================================="
echo "  Starting Chrome Debug Mode"
echo "=========================================="
echo ""

# ─── Environment Detection ───────────────────────────────────
detect_os() {
  # Using uname for more reliable detection
  case "$(uname -s)" in
    Darwin*)  echo "mac" ;;
    MINGW*|MSYS*|CYGWIN*) echo "win" ;;
    *)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        echo "wsl"
      else
        echo "linux"
      fi
      ;;
  esac
}

detect_chrome() {
  # Linux: Check one by one by priority
  local linux_paths=(
    "/opt/apps/cn.google.chrome-pre/files/google/chrome/google-chrome"  # Deepin
    "/opt/google/chrome/google-chrome"
    "/usr/bin/google-chrome"
    "/usr/bin/google-chrome-stable"
    "/usr/bin/chromium"
    "/usr/bin/chromium-browser"
    "/snap/bin/chromium"
  )
  local mac_paths=(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  )
  local win_paths=(
    "$PROGRAMFILES/Google/Chrome/Application/chrome.exe"
    "$PROGRAMFILES (x86)/Google/Chrome/Application/chrome.exe"
    "$LOCALAPPDATA/Google/Chrome/Application/chrome.exe"
    "$PROGRAMFILES/Chromium/Application/chrome.exe"
  )

  case "$OS" in
    mac)
      # macOS directly uses open command to open Chrome.app
      if [ -d "/Applications/Google Chrome.app" ]; then
        echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        return
      fi
      if [ -d "/Applications/Chromium.app" ]; then
        echo "/Applications/Chromium.app/Contents/MacOS/Chromium"
        return
      fi
      # Try command fallback
      command -v google-chrome >/dev/null 2>&1 && echo "google-chrome" && return
      ;;
    win)  # Pure Windows (Git Bash) routes through Windows paths
      for p in "${win_paths[@]}"; do
        [ -f "$p" ] && echo "$p" && return
      done
      ;;
    wsl|linux)  # Core fix: Treat WSL and Linux as similar
      for p in "${linux_paths[@]}"; do  # Check Linux paths inside WSL (/usr/bin/...)
        [ -f "$p" ] && echo "$p" && return
      done
      # Command fallback
      for cmd in google-chrome google-chrome-stable chromium chromium-browser; do
        command -v "$cmd" >/dev/null 2>&1 && echo "$cmd" && return
      done
      ;;
  esac
  echo ""
}

detect_user_data_dir() {
  case "$OS" in
    mac)  echo "$HOME/Library/Application Support/Chrome-OpenClaw-Debug" ;;
    win)  echo "$LOCALAPPDATA/Chrome-OpenClaw-Debug" ;;
    wsl)  echo "$HOME/.config/chrome-openclaw-debug" ;;
    *)    echo "$HOME/.config/chrome-openclaw-debug" ;;
  esac
}

OS=$(detect_os)
CHROME_PATH=$(detect_chrome)
USER_DATA_DIR=$(detect_user_data_dir)

echo "OS: $OS"

if [ -z "$CHROME_PATH" ]; then
  echo "✗ Chrome / Chromium not found, please install it and try again"
  echo ""
  case "$OS" in
    linux) echo "  Ubuntu/Debian: sudo apt install google-chrome-stable" ;;
    mac)   echo "  Download: https://www.google.com/chrome/" ;;
    win)   echo "  Download: https://www.google.com/chrome/" ;;
  esac
  exit 1
fi

echo "Chrome: $CHROME_PATH"
echo "User Data Directory: $USER_DATA_DIR"
echo ""

# ─── Single instance: Close existing debug Chrome ────────────
if pgrep -f "chrome.*remote-debugging-port=9222" > /dev/null 2>&1; then
  echo "Existing debug Chrome detected, closing it..."
  pkill -f "chrome.*remote-debugging-port=9222" 2>/dev/null
  sleep 2

  if pgrep -f "chrome.*remote-debugging-port=9222" > /dev/null 2>&1; then
    echo "Normal close failed, attempting force close..."
    pkill -9 -f "chrome.*remote-debugging-port=9222" 2>/dev/null
    sleep 1
  fi

  if pgrep -f "chrome.*remote-debugging-port=9222" > /dev/null 2>&1; then
    echo "✗ Could not close existing Chrome, please manually run: pkill -9 -f 'chrome.*remote-debugging-port=9222'"
    exit 1
  fi
  echo "✓ Successfully closed"
  echo ""
fi

# ─── Start Chrome ────────────────────────────────────────────
TMP_LOG="/tmp/chrome-debug.log"
[ ! -d /tmp ] && TMP_LOG="$HOME/chrome-debug.log"

echo "Starting Chrome debug mode..."
echo "Port: 9222"
echo ""

# Linux: Chrome needs --no-sandbox if running as root
EXTRA_FLAGS=""
if [[ ("$OS" == "linux" || "$OS" == "wsl") && "$(id -u)" == "0" && ! "$CHROME_PATH" == *.exe ]]; then
  echo "Running as root on Linux/WSL, adding --no-sandbox flag..."
  EXTRA_FLAGS="--no-sandbox --disable-setuid-sandbox"
fi

# Use eval if it's Windows chrome to handle spaces in path properly if needed
if [[ "$CHROME_PATH" == *.exe ]]; then
  # Ensure the directory exists (for Windows, wslpath -w gave us something like C:\...)
  mkdir -p "$(wslpath -u "$(wslpath -w "$HOME/.config/chrome-openclaw-debug")")" 2>/dev/null
  
  # Run directly with &
  "$CHROME_PATH" \
    --remote-debugging-port=9222 \
    --user-data-dir="$USER_DATA_DIR" \
    --no-first-run \
    --no-default-browser-check \
    --disable-background-networking \
    --disable-sync \
    --disable-translate \
    --disable-features=TranslateUI \
    --remote-allow-origins=* \
    > "$TMP_LOG" 2>&1 &
else
  "$CHROME_PATH" \
    $EXTRA_FLAGS \
    --remote-debugging-port=9222 \
    --user-data-dir="$USER_DATA_DIR" \
    --no-first-run \
    --no-default-browser-check \
    --disable-background-networking \
    --disable-sync \
    --disable-translate \
    --disable-features=TranslateUI \
    --remote-allow-origins=* \
    > "$TMP_LOG" 2>&1 &
fi

CHROME_PID=$!
echo "Chrome Log: $TMP_LOG"

# ─── Wait for startup ────────────────────────────────────────
echo "Waiting for Chrome to start..."
for i in {1..15}; do
  if curl -s http://127.0.0.1:9222/json/version > /dev/null 2>&1; then
    break
  fi
  echo -n "."
  sleep 1
done
echo ""
echo ""

# ─── Check results ───────────────────────────────────────────
if curl -s http://127.0.0.1:9222/json/version > /dev/null 2>&1; then
  VERSION_INFO=$(curl -s http://127.0.0.1:9222/json/version | jq -r '.Browser' 2>/dev/null || echo "Unknown version")

  echo "✓ Chrome debug mode started successfully!"
  echo ""
  echo "Chrome PID: $CHROME_PID"
  echo "Chrome Version: $VERSION_INFO"
  echo "Debug Port: http://127.0.0.1:9222"
  echo "User Data Directory: $USER_DATA_DIR"
  echo ""
  echo "Opening login pages for each Web platform (for easy authorization)..."

  WEB_URLS=(
    "https://claude.ai/new"
    "https://chatgpt.com"
    "https://www.doubao.com/chat/"
    "https://chat.qwen.ai"
    "https://www.kimi.com"
    "https://gemini.google.com/app"
    "https://grok.com"
    "https://chat.deepseek.com/"
    "https://chatglm.cn"
    "https://chat.z.ai/"
    "https://manus.im/app"
  )
  for url in "${WEB_URLS[@]}"; do
    "$CHROME_PATH" --remote-debugging-port=9222 --user-data-dir="$USER_DATA_DIR" "$url" > /dev/null 2>&1 &
    sleep 0.5
  done

  echo "✓ Opened: Claude, ChatGPT, Doubao, Qwen, Kimi, Gemini, Grok, GLM (DeepSeek logs in separately in Step 5)"
  echo ""
  echo "=========================================="
  echo "Next Steps:"
  echo "=========================================="
  echo "1. Log into the required platforms in their respective tabs"
  echo "2. Ensure browser.attachOnly=true and browser.cdpUrl=http://127.0.0.1:9222 are in your config"
  echo "3. Run ./onboard.sh webauth to select the platform and complete authorization (this browser will be reused)"
  echo ""
  echo "To stop debug mode:"
  echo "  pkill -f 'chrome.*remote-debugging-port=9222'"
  echo "=========================================="
else
  echo "✗ Chrome failed to start"
  echo ""
  echo "Please check:"
  echo "  1. Chrome Path: $CHROME_PATH"
  echo "  2. Is port 9222 already in use? Run: lsof -i:9222"
  echo "  3. User Data Directory permissions: $USER_DATA_DIR"
  echo "  4. Startup Log: $TMP_LOG"
  echo ""
  echo "Try starting it manually:"
  echo "  \"$CHROME_PATH\" --remote-debugging-port=9222 --user-data-dir=\"$USER_DATA_DIR\""
  exit 1
fi
