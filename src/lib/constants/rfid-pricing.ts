// RSL Express Linen Category Pricing
// This matches the pricing from the linen_categories table in the database

export const LINEN_CATEGORY_PRICING: { [key: string]: number } = {
  // Front of House
  'Napkins': 2.73,
  'Overlays - Extra Large': 7.74,
  'Overlays - Large': 6.60,
  'Overlays - Medium': 5.72,
  'Overlays - Small': 5.28,
  'Round Tablecloths - Large': 6.50,
  'Round Tablecloths - Medium': 5.72,
  'Round Tablecloths - Small': 5.28,
  'Tablecloths - Large': 6.60,
  'Tablecloths - Medium': 5.72,
  'Tablecloths - Small': 5.28,
  'Waiter Aprons': 4.40,
  'Waiter Bibs': 4.40,
  
  // Housekeeping
  'Bath Mats': 12.81,
  'Blanket': 11.80,
  'Curtain': 145.20,
  'Cushion Cover': 11.62,
  'Duvet Covers - Cot': 7.57,
  'Duvet Covers - Double': 11.44,
  'Duvet Covers - King': 15.31,
  'Duvet Covers - Queen': 13.38,
  'Duvet Covers - Single': 9.50,
  'Duvet Inner - King': 48.40,
  'Duvet Inner - Single': 29.04,
  'Fitted Sheet - 3/4': 7.92,
  'Fitted Sheet - Cot': 5.37,
  'Fitted Sheet - Double': 8.10,
  'Fitted Sheet - King': 10.30,
  'Fitted Sheet - Queen': 9.06,
  'Fitted Sheet - Single': 6.60,
  'Flat Sheet - 3/4': 7.92,
  'Flat Sheet - Cot': 5.37,
  'Flat Sheet - Double': 8.10,
  'Flat Sheet - King': 10.30,
  'Flat Sheet - Queen': 9.06,
  'Flat Sheet - Single': 6.60,
  'Pillow Cases - Continental (Square)': 5.10,
  'Pillow Cases - Standard': 4.84,
  'Spa Gown': 15.75,
  'Towels - Bath Sheet': 10.56,
  'Towels - Bath Towel': 8.62,
  'Towels - Extra Large': 15.05,
  'Towels - Face Cloth': 3.78,
  'Towels - Gym Towel': 6.60,
  'Towels - Hand Towel': 6.60,
  'Towels - Head Band': 3.08,
  'Towels - Pool Towel': 15.05,
  
  // Kitchen
  'Chefs Aprons': 5.37,
  'Chefs Jackets': 5.81,
  'Chefs T-Shirts': 4.66,
  'Chefs Trousers': 5.81,
  'Kitchen Cloths': 4.40,
};

// Helper function to get price for a category
export function getCategoryPrice(categoryName: string): number {
  if (!categoryName) return 10.00;
  
  // Direct match
  if (LINEN_CATEGORY_PRICING[categoryName]) {
    return LINEN_CATEGORY_PRICING[categoryName];
  }
  
  // Try case-insensitive match
  const normalizedCategory = categoryName.toLowerCase().trim();
  for (const [key, value] of Object.entries(LINEN_CATEGORY_PRICING)) {
    if (key.toLowerCase() === normalizedCategory) {
      return value;
    }
  }
  
  // Handle common variations
  const variations: { [key: string]: string } = {
    // Towels
    'bath towels': 'Towels - Bath Towel',
    'bath towel': 'Towels - Bath Towel',
    'hand towels': 'Towels - Hand Towel',
    'hand towel': 'Towels - Hand Towel',
    'pool towels': 'Towels - Pool Towel',
    'pool towel': 'Towels - Pool Towel',
    'face cloth': 'Towels - Face Cloth',
    'gym towels': 'Towels - Gym Towel',
    'gym towel': 'Towels - Gym Towel',
    'bath sheet': 'Towels - Bath Sheet',
    
    // Sheets
    'bed sheets': 'Fitted Sheet - Double',
    'bed sheet': 'Fitted Sheet - Double',
    
    // Duvet Covers
    'duvet covers': 'Duvet Covers - Double',
    'duvet cover': 'Duvet Covers - Double',
    
    // Pillow Cases
    'pillow cases': 'Pillow Cases - Standard',
    'pillow case': 'Pillow Cases - Standard',
    'pillowcases': 'Pillow Cases - Standard',
    'pillowcase': 'Pillow Cases - Standard',
    
    // Tablecloths
    'tablecloths': 'Tablecloths - Medium',
    'tablecloth': 'Tablecloths - Medium',
    
    // Others
    'napkin': 'Napkins',
    'bath mat': 'Bath Mats',
    'bathmats': 'Bath Mats',
    'bathmat': 'Bath Mats',
  };
  
  const normalizedInput = categoryName.toLowerCase().trim();
  if (variations[normalizedInput]) {
    const matchedCategory = variations[normalizedInput];
    return LINEN_CATEGORY_PRICING[matchedCategory] || 10.00;
  }
  
  // Default fallback price if category not found
  console.warn(`Price not found for category: "${categoryName}", using default R10.00`);
  return 10.00;
}

// Helper function to format price in Rands
export function formatPrice(price: number): string {
  return `R${price.toFixed(2)}`;
}

// Get all available categories
export function getAvailableCategories(): string[] {
  return Object.keys(LINEN_CATEGORY_PRICING).sort();
}

// Get categories by section
export function getCategoriesBySection(): { [section: string]: Array<{ name: string; price: number }> } {
  return {
    'Front of House': [
      { name: 'Napkins', price: 2.73 },
      { name: 'Overlays - Extra Large', price: 7.74 },
      { name: 'Overlays - Large', price: 6.60 },
      { name: 'Overlays - Medium', price: 5.72 },
      { name: 'Overlays - Small', price: 5.28 },
      { name: 'Round Tablecloths - Large', price: 6.50 },
      { name: 'Round Tablecloths - Medium', price: 5.72 },
      { name: 'Round Tablecloths - Small', price: 5.28 },
      { name: 'Tablecloths - Large', price: 6.60 },
      { name: 'Tablecloths - Medium', price: 5.72 },
      { name: 'Tablecloths - Small', price: 5.28 },
      { name: 'Waiter Aprons', price: 4.40 },
      { name: 'Waiter Bibs', price: 4.40 },
    ],
    'Housekeeping': [
      { name: 'Bath Mats', price: 12.81 },
      { name: 'Blanket', price: 11.80 },
      { name: 'Curtain', price: 145.20 },
      { name: 'Cushion Cover', price: 11.62 },
      { name: 'Duvet Covers - Cot', price: 7.57 },
      { name: 'Duvet Covers - Double', price: 11.44 },
      { name: 'Duvet Covers - King', price: 15.31 },
      { name: 'Duvet Covers - Queen', price: 13.38 },
      { name: 'Duvet Covers - Single', price: 9.50 },
      { name: 'Duvet Inner - King', price: 48.40 },
      { name: 'Duvet Inner - Single', price: 29.04 },
      { name: 'Fitted Sheet - 3/4', price: 7.92 },
      { name: 'Fitted Sheet - Cot', price: 5.37 },
      { name: 'Fitted Sheet - Double', price: 8.10 },
      { name: 'Fitted Sheet - King', price: 10.30 },
      { name: 'Fitted Sheet - Queen', price: 9.06 },
      { name: 'Fitted Sheet - Single', price: 6.60 },
      { name: 'Flat Sheet - 3/4', price: 7.92 },
      { name: 'Flat Sheet - Cot', price: 5.37 },
      { name: 'Flat Sheet - Double', price: 8.10 },
      { name: 'Flat Sheet - King', price: 10.30 },
      { name: 'Flat Sheet - Queen', price: 9.06 },
      { name: 'Flat Sheet - Single', price: 6.60 },
      { name: 'Pillow Cases - Continental (Square)', price: 5.10 },
      { name: 'Pillow Cases - Standard', price: 4.84 },
      { name: 'Spa Gown', price: 15.75 },
      { name: 'Towels - Bath Sheet', price: 10.56 },
      { name: 'Towels - Bath Towel', price: 8.62 },
      { name: 'Towels - Extra Large', price: 15.05 },
      { name: 'Towels - Face Cloth', price: 3.78 },
      { name: 'Towels - Gym Towel', price: 6.60 },
      { name: 'Towels - Hand Towel', price: 6.60 },
      { name: 'Towels - Head Band', price: 3.08 },
      { name: 'Towels - Pool Towel', price: 15.05 },
    ],
    'Kitchen': [
      { name: 'Chefs Aprons', price: 5.37 },
      { name: 'Chefs Jackets', price: 5.81 },
      { name: 'Chefs T-Shirts', price: 4.66 },
      { name: 'Chefs Trousers', price: 5.81 },
      { name: 'Kitchen Cloths', price: 4.40 },
    ]
  };
}

