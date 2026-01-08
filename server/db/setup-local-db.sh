#!/bin/bash

# Script to set up local PostgreSQL database for P&E Manager
# Run this before starting the server for the first time

echo "🚀 Setting up local PostgreSQL database for P&E Manager..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo "Please install PostgreSQL first:"
    echo "  - macOS: brew install postgresql@15"
    echo "  - Ubuntu: sudo apt-get install postgresql"
    echo "  - Or use Docker: docker run --name pe-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres"
    exit 1
fi

# Default values (can be overridden with environment variables)
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-pe_manager}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

echo "📋 Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Create database if it doesn't exist
echo "📦 Creating database '$DB_NAME'..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Database '$DB_NAME' is ready!"
    echo ""
    echo "🎯 Next steps:"
    echo "  1. Run migrations: npm run migrate"
    echo "  2. Start server: npm run dev:server"
else
    echo "❌ Failed to create database."
    echo "Please check your PostgreSQL connection and credentials."
    exit 1
fi
