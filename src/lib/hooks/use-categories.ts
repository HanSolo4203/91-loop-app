import { useQuery } from '@tanstack/react-query';

interface Category {
  id: string;
  name: string;
  price_per_item: number;
  section: string;
  is_active: boolean;
}

interface CategoriesResponse {
  success: boolean;
  data: Category[];
  error?: string;
}

async function fetchCategories(): Promise<CategoriesResponse> {
  const response = await fetch('/api/categories');
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  return response.json();
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 60 * 60 * 1000, // 1 hour (categories rarely change)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function useActiveCategories() {
  const { data, ...rest } = useCategories();
  
  return {
    ...rest,
    data: data?.data?.filter((cat: Category) => cat.is_active) || [],
  };
}

