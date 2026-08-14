-- Reviews feature: run on server BEFORE deploying + restarting watchlist-api.
-- mysql watchlist < 2026-08-14-reviews.sql

ALTER TABLE watch_history
  ADD COLUMN recommend ENUM('yes','maybe','no') NULL AFTER rating;

ALTER TABLE users
  ADD COLUMN display_name VARCHAR(100) NULL AFTER email;

UPDATE users SET display_name = 'Nathan'
  WHERE email = 'nathan.waterhouse@gmail.com';
