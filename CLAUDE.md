# Watchlist

## App Details
- **Port:** 5031 | **URL:** https://adaptiveedge.uk/watchlist/
- **PM2:** watchlist-api | **Server:** /var/www/watchlist | **DB:** MySQL watchlist

## Design System
Uses Adaptive Edge design system: Outfit/Space Grotesk fonts, dark purple with cyan/magenta accents, glass effects. Reference: `/var/www/shared-assets/DESIGN-SYSTEM-NOTES.md`

## Tech Stack
React 18 + TypeScript + Vite, Tailwind + shadcn/ui, Wouter, TanStack Query, Express + Drizzle + MySQL, OpenAI API for recommendations

## Deployment
```bash
npm run build

# After approval:
rsync -avz -e "ssh -i ~/.ssh/nathan_droplet_key" --exclude 'node_modules' --exclude '.git' ./ root@adaptiveedge.uk:/var/www/watchlist/
ssh root@adaptiveedge.uk -i ~/.ssh/nathan_droplet_key "pm2 restart watchlist-api"
```
