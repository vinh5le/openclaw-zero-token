# Installation Guide

## 📋 Prerequisites

### Required Software

1. **Node.js** (v22.12 or higher)

   ```bash
   node --version
   # Should display v22.12.x or higher
   ```

2. **npm** (usually installed with Node.js)

   ```bash
   npm --version
   # Should display 8.x.x or higher
   ```

3. **pnpm** (used for building Web UI)

   ```bash
   pnpm --version
   # If not installed, you can run:
   # corepack enable
   # corepack prepare pnpm@latest --activate
   ```

4. **Google Chrome** (for debugging browser)
   - macOS: Pre-installed
   - Linux: `sudo apt install google-chrome-stable`
   - Windows: Download and install manually

### Shell Environment (Required for Windows users)

- `onboard.sh` / `server.sh` / `start-chrome-debug.sh` must run in a **Bash environment**.
- For Windows, **WSL** is recommended (preferred) or **Git Bash**.
- Pure `cmd.exe` / native PowerShell cannot directly execute `.sh` scripts.

### Optional Software

- **Git** (for cloning the code)
  ```bash
  git --version
  ```

---

## 🚀 Installation Steps

### Step 1: Clone or Download Code

**Using Git**:

```bash
git clone <repository-url>
cd openclaw-zero-token
```

**Or Download Directly**:

- Download ZIP file
- Extract to a directory
- Enter the directory

---

### Step 2: Install Dependencies

```bash
npm install
```

**Expected Output**:

```
added 500+ packages in 30s
```

**If you encounter an error**:

```bash
# Clean cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

---

### Step 3: Compile Code

```bash
npm run build
pnpm ui:build   # Build Web UI, required when accessing http://127.0.0.1:3001
```

**Expected Output**:

```
✔ Build complete in 7919ms
✓ built in 1.13s   # ui:build
```

**Verify successful compilation**:

```bash
ls dist/index.mjs
ls dist/control-ui/index.html   # Web UI resources
# You should see that these files exist
```

---

### Step 4: Verify Installation

```bash
# Check compiled files
ls -lh dist/index.mjs

# You should see output similar to:
# -rw-r--r--  1 user  staff   2.5M Feb 27 10:00 dist/index.mjs
```

---

## 🔧 Configure Environment

### Create Configuration Directory

The configuration directory will be created automatically on the first run (recommended, no manual creation needed):

```bash
./onboard.sh webauth
```

### Check Configuration Files

```bash
# View configuration file (if exists)
cat .openclaw-zero-state/openclaw.json

# View auth configuration (if exists)
cat .openclaw-zero-state/agents/main/agent/auth-profiles.json
```

> Key Rule: Only the platforms configured via `./onboard.sh webauth` will be written to `openclaw.json` and appear in the final `/models` list.

---

## ✅ Installation Completion Checklist

- [ ] Node.js is installed (v22.12+)
- [ ] npm is installed
- [ ] pnpm is installed
- [ ] Dependencies are installed (`npm install`)
- [ ] Code is compiled (`npm run build`)
- [ ] `dist/index.mjs` file exists
- [ ] Google Chrome is installed

---

## 🎯 Next Steps

After installation, continue reading:

1. **START_HERE.md** - Quick Start Guide
2. **TEST_STEPS.md** - Detailed Testing Steps

---

## 🔧 Troubleshooting

### Q1: npm install failed

**A**: Try the following methods:

```bash
# Use domestic mirror (if in China)
npm config set registry https://registry.npmmirror.com

# Reinstall
npm install
```

### Q2: npm run build failed

**A**: Check Node.js version:

```bash
node --version
# Must be v22.12 or higher

# If the version is too low, upgrade Node.js
```

### Q3: Permission error

**A**: Do not use sudo:

```bash
# Incorrect: sudo npm install
# Correct: npm install
```

### Q4: Insufficient disk space

**A**: Check disk space:

```bash
df -h

# node_modules requires about 500MB
# dist requires about 10MB
```

---

## 📚 Related Commands

```bash
# Install dependencies
npm install

# Compile code
npm run build

# Clean compilation output
rm -rf dist

# Recompile
npm run build

# View npm scripts
npm run

# Check dependency versions
npm list --depth=0
```

---

## 🎉 Installation Successful!

Now you can start testing. Continue reading **START_HERE.md** to start the testing process.
