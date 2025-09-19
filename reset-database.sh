#!/bin/bash

# Reset Database Script for Linen Tracking System
# This script helps you reset your Supabase database with the clean schema

echo "🔄 Linen Tracking System - Database Reset Script"
echo "================================================"
echo ""
echo "This script will help you reset your Supabase database with the clean schema."
echo ""
echo "⚠️  WARNING: This will delete all existing data in your database!"
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Database reset cancelled."
    exit 1
fi

echo ""
echo "📋 Steps to reset your database:"
echo ""
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the contents of: supabase/migrations/000_reset_and_create_clean_schema.sql"
echo "4. Click 'Run' to execute the migration"
echo ""
echo "Alternatively, if you have psql installed:"
echo ""
echo "   psql 'your-supabase-connection-string' -f supabase/migrations/000_reset_and_create_clean_schema.sql"
echo ""
echo "✅ After running the migration:"
echo "- Your database will have a clean, consolidated schema"
echo "- All redundant tables and functions will be removed"
echo "- Sample data will be inserted for testing"
echo "- The application will work without 'type already exists' errors"
echo ""
echo "🔗 Supabase Dashboard: https://supabase.com/dashboard"
echo "📁 Migration file: supabase/migrations/000_reset_and_create_clean_schema.sql"
echo ""
echo "Happy coding! 🚀"
