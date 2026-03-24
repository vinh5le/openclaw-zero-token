# Testing Steps (Complete Guide)

## 🎯 Configuration Steps

### Step 1: Build

**Purpose**: Compile TypeScript code into executable JavaScript

```bash
npm install
npm run build
```

**Verification**:

```bash
ls dist/index.mjs
# You should see the compiled file
```

**Note**: If you modify the source code, you must recompile

---

### Step 2: Open Browser Debugging

**Purpose**: Provide a browser environment (Port 9222)

```bash
./start-chrome-debug.sh
```

**Verification**:

```bash
ps aux | grep "chrome.*9222" | grep -v grep
# You should see the Chrome process
```

---

### Step 3: Log in to major websites (excluding DeepSeek)

**Purpose**: Establish login sessions in the Chrome debugging browser

**Important**: You must log in using the Chrome browser started by `start-chrome-debug` (not your normal browser). **DeepSeek is handled separately in Step 5**

Open and log in to the following platforms in Chrome:

1. **Qwen International**: https://chat.qwen.ai
2. **Qwen CN**: https://www.qianwen.com
3. **Kimi**: https://kimi.moonshot.cn
4. **Claude**: https://claude.ai
5. **Doubao**: https://www.doubao.com/chat/
6. **ChatGPT**: https://chatgpt.com
7. **Gemini**: https://gemini.google.com/app
8. **Grok**: https://grok.com
9. **GLM Web (Zhipu)**: https://chatglm.cn
10. **GLM International**: https://chat.z.ai

**Note**: Manus uses API Key authentication, no browser login required. API Key retrieval address: https://open.manus.im

---

### Step 4: Configure Onboard

**Purpose**: Configure authentication information for each platform

```bash
./onboard.sh webauth
```

**Action**: Select the platform (e.g., `deepseek-web`), follow prompts to complete authentication

---

### Step 5: Log in to DeepSeek

**Purpose**: Log in to DeepSeek in Chrome, and capture authentication via onboard

1. Visit https://chat.deepseek.com in Chrome and log in
2. Run `./onboard.sh webauth`, select **deepseek-web** to complete credential capture

---

### Step 6: Start Server

**Purpose**: Start the Web UI service (Port 3001)

```bash
./server.sh start
```

**Verification**:

```bash
./server.sh status
# It should display: Gateway server is running
```

---

### Access Web UI

**Access Address**:

```
http://127.0.0.1:3001/#token=62b791625fa441be036acd3c206b7e14e2bb13c803355823
```

The browser should open automatically. If not, manually visit the address above.

---

### Step 7: View all models

**Key Rules (Please read carefully)**:

- `/models` displays the collection of platforms and models that have **completed onboard configuration**.
- Only platforms you actually selected and completed authentication for in `./onboard.sh webauth` will be written to `openclaw.json` and appear in the final models list.
- Platforms you only logged into via browser but haven't finished onboard for **will not** appear in `/models`.

Type in the Web UI chat box:

```
/models
```

**Expected Result**: You should see the following models

```
claude-web/claude-sonnet-4-6
claude-web/claude-opus-4-6
claude-web/claude-haiku-4-6
doubao-web/doubao-seed-2.0
doubao-web/doubao-pro
chatgpt-web/gpt-4
chatgpt-web/gpt-4-turbo
chatgpt-web/gpt-3.5-turbo
qwen-web/qwen-max
qwen-web/qwen-plus
qwen-web/qwen-turbo
kimi-web/moonshot-v1-8k
kimi-web/moonshot-v1-32k
kimi-web/moonshot-v1-128k
gemini-web/gemini-pro
gemini-web/gemini-ultra
grok-web/grok-2
grok-web/grok-1
glm-web/glm-4-plus (GLM)
glm-web/glm-4-think (GLM)
manus-api/manus-1.6
manus-api/manus-1.6-lite
```

---

### Step 8: Test Conversation

**Action**:

1. Select a model in the Web UI (e.g., `claude-web/claude-sonnet-4-6`)
2. Send a test message: "Hello, please introduce yourself"
3. Verify if you receive an appropriate response

**Repeat the test for each platform**:

- ✅ claude-web
- ✅ doubao-web
- ✅ chatgpt-web
- ✅ qwen-web
- ✅ kimi-web
- ✅ gemini-web
- ✅ grok-web
- ✅ deepseek-web
- ✅ glm-web (GLM)
- ✅ manus-api (Requires API Key)

---

## 📊 Configuration Flowchart

```
┌─────────────────────────────────────┐
│ 1. Build                            │
│    npm install && npm run build     │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 2. Open browser debugging           │
│    ./start-chrome-debug.sh          │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 3. Log in to platforms (Excl. DeepS)│
│    (Qwen, Kimi, etc., DeepSeek 5)   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 4. Configure onboard                │
│    ./onboard.sh webauth             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 5. Log in to DeepSeek               │
│    (Chrome login + onboard capture) │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 6. Start server                     │
│    ./server.sh start                │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Open Web UI → http://127.0.0.1:3001 │
│ Type /models → Test conversation    │
└─────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Issue 1: Port Conflict

**Symptoms**: Gateway failed to start, port is already in use

**Solution**:

```bash
# Find the process occupying port 3001
lsof -i :3001

# Kill the process
kill <PID>

# Or forcefully stop
./server.sh stop
```

### Issue 2: Chrome Debug Browser Not Started

**Symptoms**: onboard prompts unable to connect to browser

**Solution**:

```bash
# Check if Chrome is running
ps aux | grep "chrome.*9222"

# Restart it
./start-chrome-debug.sh
```

### Issue 3: Authentication Failed

**Symptoms**: Auth error prompted during test conversation

**Solution**:

1. Ensure you have already logged in via the Chrome debug browser.
2. Run `./onboard.sh webauth` again to configure authentication.
3. Check if your cookies are valid.

### Issue 4: Model List is Empty

**Symptoms**: `/models` command shows no models

**Solution**:

```bash
# Restart Gateway
./server.sh restart

# Check config file
cat .openclaw-zero-state/openclaw.json | jq '.models.providers | keys'

# Tail logs
tail -f /tmp/openclaw-zero-gateway.log
```

### Issue 5: glm-intl-web Authentication or API Error

**Symptoms**: `glm-intl-web` returns errors like `Authentication expired` or `API 500/401`.

**Explanation**:

- The request chain for the international version `https://chat.z.ai/` differs from `glm-web(chatglm.cn)`, and endpoints may change along with frontend updates.
- The current implementation has been switched to prioritize reusing the browser page (UI driven) to improve stability.

**Troubleshooting Advice**:

```bash
# 1) Ensure the debug browser is running and logged in
./start-chrome-debug.sh

# 2) Re-authorize glm-intl-web
./onboard.sh webauth

# 3) Use packet capture scripts to analyze actual requests (scripts moved to test/)
node test/fix-glm-intl-api.js
```

---

## 📝 Quick Command Reference

```bash
# First time use: install dependencies and build
npm install
npm run build

# Stop system Gateway
openclaw gateway stop

# Start Chrome debugging
./start-chrome-debug.sh

# Configure auth
./onboard.sh webauth

# Start local Gateway
./server.sh start

# View status
./server.sh status

# Restart Gateway
./server.sh restart

# Stop Gateway
./server.sh stop

# Tail logs
tail -f /tmp/openclaw-zero-gateway.log

# Check config
cat .openclaw-zero-state/openclaw.json | jq '.models.providers | keys'

# Check auth profiles
cat .openclaw-zero-state/agents/main/agent/auth-profiles.json | jq '.profiles | keys'
```

---

## 🧪 Debug Scripts Location

The GLM debugging scripts specifically reside globally in `test/`:

- `test/fix-glm-intl-api.js`: Auto-send test messages and capture requests/responses
- `test/debug-glm-intl-api.js`: Continuously listen to intl API requests
- `test/debug-glm-requests.js`: Intercept and print POST requests
- `test/capture-glm-api.js`: CDP/Fetch level debugging
- `test/quick-debug-glm.js`: Quick connectivity testing
- `test/direct-capture.js`: WebSocket direct connection capture

---

## ✅ Criteria For Completion

- ✅ All 10 platforms are visible in `/models`
- ✅ Each platform successfully sends a message and receives a reply
- ✅ Streamed responses work properly (shown word-by-word)
- ✅ No authentication errors or API errors

---

Happy testing! 🚀
