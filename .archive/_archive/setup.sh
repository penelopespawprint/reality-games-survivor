#!/bin/bash

# RGFL Survivor Fantasy League - Setup Script
# This script sets up the development environment and prepares for deployment

set -e  # Exit on any error

echo "🏝️  RGFL Survivor Fantasy League - Setup Script"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_status "Node.js version: $NODE_VERSION"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_status "npm version: $NPM_VERSION"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    npm install
    print_status "Dependencies installed successfully"
}

# Generate Prisma client
generate_prisma() {
    print_info "Generating Prisma client..."
    npx prisma generate
    print_status "Prisma client generated"
}

# Setup database
setup_database() {
    print_info "Setting up database..."
    
    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        print_warning "DATABASE_URL not set. Using default database URL."
        export DATABASE_URL="postgresql://rgfl_survivor_db_user:cPam8QBgB6uK7lUBZHDUgo7uAhIsMKSV@dpg-d3fohbc9c44c73dagrm0-a/rgfl_survivor_db"
    fi
    
    # Push database schema
    print_info "Pushing database schema..."
    npx prisma db push --force-reset
    
    print_status "Database schema pushed successfully"
}

# Seed database
seed_database() {
    print_info "Seeding database with initial data..."
    npm run db:seed
    print_status "Database seeded successfully"
}

# Build the application
build_app() {
    print_info "Building application..."
    npm run build
    print_status "Application built successfully"
}

# Start development server
start_dev() {
    print_info "Starting development server..."
    print_warning "Press Ctrl+C to stop the server"
    npm run dev
}

# Deploy to Render
deploy_render() {
    print_info "Preparing for Render deployment..."
    
    # Check if git is initialized
    if [ ! -d ".git" ]; then
        print_error "Git repository not initialized. Please run 'git init' first."
        exit 1
    fi
    
    # Check if changes are committed
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "You have uncommitted changes. Please commit them first."
        git status
        exit 1
    fi
    
    print_info "Pushing to GitHub..."
    git push origin main
    print_status "Code pushed to GitHub. Render will automatically deploy."
}

# Main setup function
main() {
    echo "Starting setup process..."
    echo ""
    
    # Check prerequisites
    check_node
    check_npm
    
    # Install dependencies
    install_dependencies
    
    # Generate Prisma client
    generate_prisma
    
    # Setup database
    setup_database
    
    # Seed database
    seed_database
    
    # Build application
    build_app
    
    echo ""
    print_status "Setup completed successfully! 🎉"
    echo ""
    echo "Next steps:"
    echo "1. Run './setup.sh dev' to start development server"
    echo "2. Run './setup.sh deploy' to deploy to Render"
    echo "3. Visit https://rgfl-survivor.onrender.com to see your app"
    echo ""
}

# Handle command line arguments
case "${1:-}" in
    "dev")
        print_info "Starting development mode..."
        npm run dev
        ;;
    "deploy")
        deploy_render
        ;;
    "build")
        build_app
        ;;
    "db")
        setup_database
        seed_database
        ;;
    "help"|"-h"|"--help")
        echo "RGFL Survivor Setup Script"
        echo ""
        echo "Usage: ./setup.sh [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)  - Full setup (install, build, seed database)"
        echo "  dev        - Start development server"
        echo "  deploy     - Deploy to Render"
        echo "  build      - Build the application"
        echo "  db         - Setup and seed database only"
        echo "  help       - Show this help message"
        echo ""
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Run './setup.sh help' for usage information"
        exit 1
        ;;
esac

