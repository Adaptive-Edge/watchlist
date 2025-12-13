#!/bin/bash

# Adaptive Edge App Template Setup Script
# Usage: ./setup.sh "App Name" "app-slug" "Description" 5013

if [ $# -lt 4 ]; then
    echo "Usage: ./setup.sh \"App Name\" \"app-slug\" \"Description\" PORT"
    echo "Example: ./setup.sh \"My Tool\" \"my-tool\" \"A helpful tool\" 5013"
    exit 1
fi

APP_NAME="$1"
APP_SLUG="$2"
APP_DESCRIPTION="$3"
PORT="$4"
DB_PASSWORD="${5:-YOUR_DB_PASSWORD}"

echo "Setting up: $APP_NAME ($APP_SLUG) on port $PORT"

# Find and replace in all files
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.html" -o -name "*.css" -o -name "*.md" -o -name "*.cjs" \) -exec sed -i '' \
    -e "s/{{APP_NAME}}/$APP_NAME/g" \
    -e "s/{{APP_SLUG}}/$APP_SLUG/g" \
    -e "s/{{APP_DESCRIPTION}}/$APP_DESCRIPTION/g" \
    -e "s/{{PORT}}/$PORT/g" \
    -e "s/{{DB_PASSWORD}}/$DB_PASSWORD/g" \
    {} \;

echo "Done! Next steps:"
echo "1. npm install"
echo "2. Create MySQL database: CREATE DATABASE $APP_SLUG;"
echo "3. npm run db:push"
echo "4. npm run dev"
