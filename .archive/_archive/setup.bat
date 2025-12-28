@echo off
REM RGFL Survivor Fantasy League - Windows Setup Script
REM This script sets up the development environment and prepares for deployment

echo 🏝️  RGFL Survivor Fantasy League - Setup Script
echo ==============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm is installed
npm --version

REM Install dependencies
echo ℹ️  Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully

REM Generate Prisma client
echo ℹ️  Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)
echo ✅ Prisma client generated

REM Setup database
echo ℹ️  Setting up database...
set DATABASE_URL=postgresql://rgfl_survivor_db_user:cPam8QBgB6uK7lUBZHDUgo7uAhIsMKSV@dpg-d3fohbc9c44c73dagrm0-a/rgfl_survivor_db

echo ℹ️  Pushing database schema...
call npx prisma db push --force-reset
if %errorlevel% neq 0 (
    echo ❌ Failed to push database schema
    pause
    exit /b 1
)
echo ✅ Database schema pushed successfully

REM Seed database
echo ℹ️  Seeding database with initial data...
call npm run db:seed
if %errorlevel% neq 0 (
    echo ❌ Failed to seed database
    pause
    exit /b 1
)
echo ✅ Database seeded successfully

REM Build the application
echo ℹ️  Building application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build application
    pause
    exit /b 1
)
echo ✅ Application built successfully

echo.
echo ✅ Setup completed successfully! 🎉
echo.
echo Next steps:
echo 1. Run 'npm run dev' to start development server
echo 2. Run 'git push origin main' to deploy to Render
echo 3. Visit https://rgfl-survivor.onrender.com to see your app
echo.
pause

