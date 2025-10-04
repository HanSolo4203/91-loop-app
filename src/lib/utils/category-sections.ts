import type { LinenCategory } from '@/types/database';

export interface CategorySection {
  name: string;
  categories: LinenCategory[];
}

/**
 * Categorizes linen categories into sections based on their names
 */
export function categorizeBySections(categories: LinenCategory[]): CategorySection[] {
  const sections: CategorySection[] = [
    {
      name: 'Housekeeping',
      categories: []
    },
    {
      name: 'Kitchen',
      categories: []
    },
    {
      name: 'Front of House',
      categories: []
    },
    {
      name: 'Other',
      categories: []
    }
  ];

  categories.forEach(category => {
    const name = category.name.toUpperCase();
    
    if (
      name.includes('SHEET') ||
      name.includes('DUVET') ||
      name.includes('TOWEL') ||
      name.includes('PILLOW') ||
      name.includes('BATH') ||
      name.includes('SPA') ||
      name.includes('BLANKET') ||
      name.includes('CUSHION') ||
      name.includes('CURTAIN') ||
      name.includes('MATTRESS') ||
      name.includes('FLEECE')
    ) {
      sections[0].categories.push(category); // Housekeeping
    } else if (
      name.includes('CHEF') ||
      name.includes('KITCHEN')
    ) {
      sections[1].categories.push(category); // Kitchen
    } else if (
      name.includes('NAPPINS') ||
      name.includes('WAITER') ||
      name.includes('TABLECLOTH') ||
      name.includes('OVERLAY') ||
      name.includes('ROUND')
    ) {
      sections[2].categories.push(category); // Front of House
    } else {
      sections[3].categories.push(category); // Other
    }
  });

  // Sort categories within each section alphabetically
  sections.forEach(section => {
    section.categories.sort((a, b) => a.name.localeCompare(b.name));
  });

  // Remove empty sections
  return sections.filter(section => section.categories.length > 0);
}
