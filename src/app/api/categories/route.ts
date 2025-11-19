import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { LinenCategory, LinenCategoryInsert } from '@/types/database';

// GET /api/categories - Get all linen categories
export async function GET() {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from('linen_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: categories || []
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create a new linen category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, price_per_item, is_active = true } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    if (price_per_item === undefined || price_per_item === null) {
      return NextResponse.json(
        { success: false, error: 'Price per item is required' },
        { status: 400 }
      );
    }

    if (typeof price_per_item !== 'number' || price_per_item < 0) {
      return NextResponse.json(
        { success: false, error: 'Price per item must be a non-negative number' },
        { status: 400 }
      );
    }

    // Check if category name already exists
    const { data: existingCategory, error: checkError } = await supabaseAdmin
      .from('linen_categories')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing category:', checkError);
      return NextResponse.json(
        { success: false, error: 'Failed to check existing category' },
        { status: 500 }
      );
    }

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category with this name already exists' },
        { status: 409 }
      );
    }

    // Create new category
    const newCategory: LinenCategoryInsert = {
      name: name.trim(),
      price_per_item,
      is_active
    };

    const { data: category, error } = await supabaseAdmin
      .from('linen_categories')
      .insert(newCategory)
      .select()
      .single<LinenCategory>();

    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create category' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}