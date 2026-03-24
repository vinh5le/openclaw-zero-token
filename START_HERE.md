### 🚀 Start Here

#### Quick Setup (6 Steps)

**First time? Read INSTALLATION.md first!**

```bash
# 1. Build
npm install
npm run build

# 2. Open browser debug mode
./start-chrome-debug.sh

# 3. Login to platforms (Qwen, Kimi, Claude, etc. — exclude DeepSeek)
# 4. Configure onboard
./onboard.sh webauth

# 5. Login DeepSeek (Chrome + onboard deepseek-web)
# 6. Start server
./server.sh start
```

> **Important:** Only platforms completed in `./onboard.sh webauth` are written into `openclaw.json` and shown in `/models`.

Then visit: http://127.0.0.1:3001/#token=62b791625fa441be036acd3c206b7e14e2bb13c803355823

#### Platforms to Login

**Step 3 (exclude DeepSeek)**

1. https://chat.qwen.ai
2. https://www.qianwen.com
3. https://kimi.moonshot.cn
4. https://claude.ai
5. https://www.doubao.com/chat/
6. https://chatgpt.com
7. https://gemini.google.com/app
8. https://grok.com
9. https://chatglm.cn
10. https://chat.z.ai/

**Step 5 (DeepSeek only)**  
11. https://chat.deepseek.com

#### Test Status

| Platform                                                                                                                                  | Status    |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| DeepSeek, Qwen International, Qwen CN, Kimi, Claude Web, Doubao, ChatGPT Web, Gemini Web, Grok Web, GLM Web, GLM International, Manus API | ✅ Tested |

#### Expected Results

After testing, you will have:

- ✅ 12 available platforms (11 Web platforms + Manus API)
- ✅ 28+ selectable AI models
- ✅ Completely free AI conversation service
- ✅ Unified browser approach

#### Need Help?

See **TEST_STEPS.md** for detailed testing steps and troubleshooting.
