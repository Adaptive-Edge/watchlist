# {{APP_NAME}}

An Adaptive Edge application.

## Quick Start

1. **Replace placeholders** in all files:
   - `{{APP_NAME}}` - Display name (e.g., "TierSort Survey")
   - `{{APP_SLUG}}` - URL slug (e.g., "tiersort")
   - `{{APP_DESCRIPTION}}` - Short description
   - `{{PORT}}` - Server port (e.g., 5013)
   - `{{DB_PASSWORD}}` - MySQL password

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create MySQL database:**
   ```sql
   CREATE DATABASE {{APP_SLUG}};
   ```

4. **Run database migrations:**
   ```bash
   npm run db:push
   ```

5. **Start development:**
   ```bash
   npm run dev
   ```

## Deployment

1. **Build:**
   ```bash
   npm run build
   ```

2. **Copy to server:**
   ```bash
   scp -r dist/* root@adaptiveedge.uk:/var/www/{{APP_SLUG}}/
   scp ecosystem.config.cjs root@adaptiveedge.uk:/var/www/{{APP_SLUG}}/
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

4. **Add Apache config:**
   ```apache
   # Static files
   Alias /{{APP_SLUG}} /var/www/{{APP_SLUG}}/public
   <Directory /var/www/{{APP_SLUG}}/public>
       AllowOverride All
       Require all granted
       RewriteEngine On
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /{{APP_SLUG}}/index.html [L]
   </Directory>

   # API proxy
   ProxyPass /{{APP_SLUG}}/api http://127.0.0.1:{{PORT}}/api retry=0
   ProxyPassReverse /{{APP_SLUG}}/api http://127.0.0.1:{{PORT}}/api
   ```

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Wouter, TanStack Query
- **Backend:** Node.js, Express, TypeScript, Drizzle ORM
- **Database:** MySQL
- **Deployment:** PM2, Apache reverse proxy
