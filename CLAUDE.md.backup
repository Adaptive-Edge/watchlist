# Claude Code Instructions for Adaptive Edge

## ⛔ STOP - READ THIS BEFORE EVERY TASK

You MUST complete these steps IN ORDER. Do not skip any step.

1. Run `pm2 list` to check server state
2. Make changes to SOURCE files only
3. Run `npm run dev` and confirm it works locally
4. Run `npm run build`
5. Ask user "Ready to deploy?" - WAIT for approval

---

## Defensive Rules (ALWAYS)

### Never Do Without Explicit Permission:
- ❌ `npm install` or `npm run build` on the server
- ❌ Push to `main` branch (this repo may auto-deploy!)
- ❌ Modify files directly on the server in `/var/www/`
- ❌ Restart or delete PM2 processes
- ❌ Run database migrations
- ❌ Edit compiled/dist files (always edit source)

### Always Do:
- ✅ Run `pm2 list` before touching anything
- ✅ Check `git status` before modifying any repo
- ✅ Build and test locally first (`npm run dev`)
- ✅ Show diffs before making changes
- ✅ Ask before deploying
- ✅ Work on feature branches for non-trivial changes

---

## This App

- **Name:** Watchlist
- **Port:** 5031
- **URL:** https://adaptiveedge.uk/watchlist/
- **PM2 Process:** watchlist-api
- **Server Path:** /var/www/watchlist/
- **Database:** MySQL - `watchlist`

---

## Server Access
```bash
# SSH
ssh root@adaptiveedge.uk -i ~/.ssh/nathan_droplet_key

# Quick commands
ssh root@adaptiveedge.uk -i ~/.ssh/nathan_droplet_key "pm2 list"
ssh root@adaptiveedge.uk -i ~/.ssh/nathan_droplet_key "pm2 logs watchlist-api --lines 20"
```

---

## Design System

This app uses the Adaptive Edge design system:
- **Fonts:** Outfit (headings), Space Grotesk (body), JetBrains Mono (code)
- **Theme:** Dark purple with cyan/magenta accents
- **CSS Variables:** `--ae-accent-cyan`, `--ae-accent-magenta`
- **Glass effects:** `glass` class for frosted panels

Reference: `/var/www/shared-assets/DESIGN-SYSTEM-NOTES.md`

---

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Wouter (routing) + TanStack Query
- Express.js + Drizzle ORM + MySQL
- OpenAI API for recommendations

---

## Deployment (Only When Explicitly Asked)
```bash
# 1. Build locally
npm run build

# 2. ASK USER BEFORE PROCEEDING

# 3. If approved, deploy:
rsync -avz -e "ssh -i ~/.ssh/nathan_droplet_key" --exclude 'node_modules' --exclude '.git' ./ root@adaptiveedge.uk:/var/www/watchlist/

# 4. Restart:
ssh root@adaptiveedge.uk -i ~/.ssh/nathan_droplet_key "pm2 restart watchlist-api"
```

---

## Local Development
```bash
npm install
npm run dev
# App runs at http://localhost:5031
```
