#!/bin/bash
# Database Verification Script
# Compares migration files with applied migrations

echo "🔍 Database Verification Script"
echo "================================"
echo ""

# Check if Supabase is linked
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo "❌ Supabase project not linked. Run: npx supabase link"
    exit 1
fi

PROJECT_REF=$(cat supabase/.temp/project-ref)
echo "📋 Project: $PROJECT_REF"
echo ""

# Count migration files
MIGRATION_FILES=$(find supabase/migrations -name "*.sql" -type f | wc -l | tr -d ' ')
echo "📁 Migration files found: $MIGRATION_FILES"

# List all migration files
echo ""
echo "Migration Files:"
ls -1 supabase/migrations/*.sql | sed 's/.*\///' | nl

echo ""
echo "✅ Next steps:"
echo "1. Run the SQL verification script in Supabase SQL Editor:"
echo "   supabase/verify_database.sql"
echo ""
echo "2. Or check applied migrations directly:"
echo "   SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"
echo ""
echo "3. Compare with your migration files to see what's missing"
