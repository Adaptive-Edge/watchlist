module.exports = {
  apps: [{
    name: 'watchlist-api',
    script: 'index.js',
    cwd: '/var/www/watchlist',
    env: {
      PORT: 5031,
      DB_HOST: 'localhost',
      DB_USER: 'admin',
      DB_PASSWORD: '471a1f5e3d41055fff736c8aa76fad658b276fb7e75f5a34',
      DB_NAME: 'watchlist',
      NODE_ENV: 'production',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
    }
  }]
};
