// Secrets live in .env next to this file (gitignored, excluded from rsync).
const fs = require('fs');
const path = require('path');
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

module.exports = {
  apps: [{
    name: "watchlist-api",
    script: "dist/index.js",
    cwd: "/var/www/watchlist",
    env: {
      PORT: 5031,
      DB_HOST: "localhost",
      DB_USER: "admin",
      DB_NAME: "watchlist",
      NODE_ENV: "production",
      DB_PASSWORD: process.env.DB_PASSWORD || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      TMDB_API_KEY: process.env.TMDB_API_KEY || '',
      GUARDIAN_API_KEY: process.env.GUARDIAN_API_KEY || '',
      ADMIN_SECRET: process.env.ADMIN_SECRET || ''
    }
  }]
};
