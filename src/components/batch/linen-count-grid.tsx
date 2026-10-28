'use client';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Package, AlertCircle, Search, X, LayoutGrid, List, Pencil } from 'lucide-react';
import { formatCurrencySSR } from '@/lib/utils/formatters';
import { categorizeBySections } from '@/lib/utils/category-sections';
import type { LinenCategory } from '@/types/database';
import {
  LinenListTable,
  LinenRow,
  LinenTile,
  SortableLinenEntry,
  type DragHandleProps,
  type LinenEntryProps,
} from '@/components/batch/linen-layout-item';

export interface LinenCountItem {
  category: LinenCategory;
  quantity_sent: number;
  quantity_received: number;
  price_per_item: number;
  subtotal: number;
  discrepancy_details?: string;
  express_delivery?: boolean;
}

interface PrefilledItem {
  linen_category_id: string;
  quantity_sent: number;
  quantity_received: number;
  price_per_item?: number;
  discrepancy_details?: string | null;
  express_delivery?: boolean;
}

interface LinenCountGridProps {
  categories: LinenCategory[];
  onItemsChange: (items: LinenCountItem[]) => void;
  isLoading?: boolean;
  error?: string;
  initialSelections?: PrefilledItem[];
  favoriteCategoryIds?: string[];
  onToggleFavorite?: (categoryId: string, nextFavorite: boolean) => void;
  /** Saved category order. Null means this client has no layout yet. */
  layoutCategoryIds?: string[] | null;
  onSaveLayout?: (categoryIds: string[]) => Promise<boolean>;
}

export interface LinenCountGridRef {
  getItems: () => LinenCountItem[];
  setExpressForAll: (enabled: boolean) => void;
}

const LinenCountGrid = forwardRef<LinenCountGridRef, LinenCountGridProps>(({
  categories,
  onItemsChange,
  isLoading = false,
  error,
  initialSelections,
  favoriteCategoryIds = [],
  onToggleFavorite,
  layoutCategoryIds = null,
  onSaveLayout,
}, ref) => {
  const [items, setItems] = useState<LinenCountItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tiles' | 'rows'>('tiles');
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [draftLayoutIds, setDraftLayoutIds] = useState<string[] | null>(null);
  const [layoutError, setLayoutError] = useState('');
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [addingCategoryId, setAddingCategoryId] = useState<string | null>(null);
  const onItemsChangeRef = useRef(onItemsChange);
  const normalizedInitialSelections = useMemo(() => initialSelections ?? [], [initialSelections]);
  const favoriteIdsSet = useMemo(() => new Set(favoriteCategoryIds), [favoriteCategoryIds]);

  // Update the ref when the callback changes
  useEffect(() => {
    onItemsChangeRef.current = onItemsChange;
  }, [onItemsChange]);

  const setExpressForAll = (enabled: boolean) => {
    setItems((prevItems) =>
      prevItems.map((item) => ({
        ...item,
        express_delivery: item.quantity_sent > 0 ? enabled : false,
      }))
    );
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getItems: () => items,
    setExpressForAll,
  }), [items]);

  // Initialize items when categories or initial selections change
  useEffect(() => {
    if (categories.length === 0) {
      setItems([]);
      return;
    }

    const prefilledMap = new Map(
      normalizedInitialSelections.map((selection) => [selection.linen_category_id, selection])
    );

    const initialItems: LinenCountItem[] = categories.map((category) => {
      const existing = prefilledMap.get(category.id);
      const quantitySent = existing ? existing.quantity_sent : 0;
      const quantityReceived = existing ? existing.quantity_received : 0;
      const pricePerItem = existing?.price_per_item ?? category.price_per_item;

      return {
        category,
        quantity_sent: quantitySent,
        quantity_received: quantityReceived,
        price_per_item: pricePerItem,
        subtotal: quantityReceived * pricePerItem,
        discrepancy_details: existing?.discrepancy_details || '',
        express_delivery: existing?.express_delivery || false,
      };
    });

    setItems(initialItems);
    // Don't notify parent during initialization - only on user interaction
  }, [categories, normalizedInitialSelections]);

  // Notify parent when items change (but not during initialization)
  useEffect(() => {
    if (items.length > 0) {
      onItemsChangeRef.current(items);
    }
  }, [items]);

  // Handle click outside to blur cards
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-card-id]')) {
        setFocusedCardId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const hasSavedLayout = Array.isArray(layoutCategoryIds) && layoutCategoryIds.length > 0;
  const layoutKey = layoutCategoryIds?.join('|') ?? '';
  const layoutKeyRef = useRef(layoutKey);

  useEffect(() => {
    if (layoutKeyRef.current === layoutKey) return;
    layoutKeyRef.current = layoutKey;
    setIsEditingLayout(false);
    setDraftLayoutIds(null);
    setLayoutError('');
  }, [layoutKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const beginLayoutEdit = () => {
    const source = hasSavedLayout && layoutCategoryIds
      ? layoutCategoryIds
      : categorizeBySections(categories).flatMap((section) => section.categories.map((category) => category.id));
    const seen = new Set<string>();
    const nextIds = source.filter((id) => {
      if (!categoryById.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    setDraftLayoutIds(nextIds);
    setIsEditingLayout(true);
    setLayoutError('');
  };

  const cancelLayoutEdit = () => {
    setIsEditingLayout(false);
    setDraftLayoutIds(null);
    setLayoutError('');
    setSearchQuery('');
  };

  const handleSaveLayout = async () => {
    if (!onSaveLayout) return;
    if (!draftLayoutIds || draftLayoutIds.length === 0) {
      setLayoutError('Add at least one category before saving this layout.');
      return;
    }

    setIsSavingLayout(true);
    setLayoutError('');
    try {
      const saved = await onSaveLayout(draftLayoutIds);
      if (saved) {
        setIsEditingLayout(false);
        setDraftLayoutIds(null);
        setSearchQuery('');
      } else {
        setLayoutError('Could not save this layout. Please try again.');
      }
    } catch {
      setLayoutError('Could not save this layout. Please try again.');
    } finally {
      setIsSavingLayout(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !draftLayoutIds) return;
    const oldIndex = draftLayoutIds.indexOf(String(active.id));
    const newIndex = draftLayoutIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setDraftLayoutIds(arrayMove(draftLayoutIds, oldIndex, newIndex));
  };

  const removeFromLayout = (categoryId: string) => {
    setDraftLayoutIds((current) => (current ?? []).filter((id) => id !== categoryId));
  };

  const addToLayout = (categoryId: string) => {
    setDraftLayoutIds((current) => {
      const next = current ?? [];
      if (next.includes(categoryId)) return next;
      return [...next, categoryId];
    });
    setSearchQuery('');
  };

  const addCategoryToClientList = async (categoryId: string) => {
    if (!onSaveLayout || !layoutCategoryIds || layoutCategoryIds.includes(categoryId)) return;

    setAddingCategoryId(categoryId);
    setLayoutError('');
    try {
      const saved = await onSaveLayout([...layoutCategoryIds, categoryId]);
      if (!saved) {
        setLayoutError("Could not add that category to this client's list.");
      }
    } catch {
      setLayoutError("Could not add that category to this client's list.");
    } finally {
      setAddingCategoryId(null);
    }
  };

  // Validate quantity input
  const validateQuantity = (value: string): boolean => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0) {
      return false;
    }
    if (num > 10000) {
      return false;
    }
    return true;
  };

  // Handle quantity change
  const handleQuantityChange = (categoryId: string, field: 'sent' | 'received', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    
    // Validate input
    if (value !== '' && !validateQuantity(value)) {
      setValidationErrors(prev => ({
        ...prev,
        [`${categoryId}-${field}`]: `Invalid quantity. Must be 0-10,000`
      }));
      return;
    }

    // Clear validation error
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${categoryId}-${field}`];
      return newErrors;
    });

    // Update items
    setItems(prev => {
      const newItems = prev.map(item => {
        if (item.category.id === categoryId) {
          const updatedItem = { ...item };
          
          if (field === 'sent') {
            updatedItem.quantity_sent = numValue;
            // Auto-set received to sent if received is 0
            if (updatedItem.quantity_received === 0) {
              updatedItem.quantity_received = numValue;
            }
          } else {
            updatedItem.quantity_received = numValue;
          }
          
          // Calculate subtotal
          updatedItem.subtotal = updatedItem.quantity_received * updatedItem.price_per_item;
          
          return updatedItem;
        }
        return item;
      });
      
      return newItems;
    });
  };

  // Handle discrepancy details change
  const handleDiscrepancyDetailsChange = (categoryId: string, value: string) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.category.id === categoryId) {
          return {
            ...item,
            discrepancy_details: value,
          };
        }
        return item;
      });
      
      return newItems;
    });
  };

  // Handle copy quantity sent to received
  const handleCopyQuantityToReceived = (categoryId: string) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.category.id === categoryId) {
          const updatedItem = { ...item };
          updatedItem.quantity_received = updatedItem.quantity_sent;
          
          // Calculate subtotal
          updatedItem.subtotal = updatedItem.quantity_received * updatedItem.price_per_item;
          
          return updatedItem;
        }
        return item;
      });
      
      return newItems;
    });
  };

  // Handle clear discrepancy details
  const handleClearDiscrepancyDetails = (categoryId: string) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.category.id === categoryId) {
          return {
            ...item,
            discrepancy_details: '',
          };
        }
        return item;
      });
      
      return newItems;
    });
  };

  // Handle clear all fields (quantities and discrepancy details)
  const handleClearAllFields = (categoryId: string) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.category.id === categoryId) {
          const updatedItem = { ...item };
          updatedItem.quantity_sent = 0;
          updatedItem.quantity_received = 0;
          updatedItem.subtotal = 0;
          updatedItem.discrepancy_details = '';
          updatedItem.express_delivery = false;
          
          return updatedItem;
        }
        return item;
      });
      
      return newItems;
    });
  };

  // Handle express delivery toggle
  const handleExpressDeliveryToggle = (categoryId: string, checked: boolean) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.category.id === categoryId) {
          return {
            ...item,
            express_delivery: checked,
          };
        }
        return item;
      });
      
      return newItems;
    });
  };


  // Handle card click to focus
  const handleCardClick = (categoryId: string) => {
    setFocusedCardId(categoryId);
  };

  // Use SSR-safe currency formatting

  // Filter and sort categories based on search query and favourites
  const getFilteredSections = () => {
    const baseSections = categorizeBySections(categories);

    // If there's a search term, show matches with favourites first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchingCategories = categories.filter((category) =>
        category.name.toLowerCase().includes(query)
      );

      if (matchingCategories.length === 0) {
        return [];
      }

      const favoriteMatches = matchingCategories.filter((category) => favoriteIdsSet.has(category.id));
      const nonFavoriteMatches = matchingCategories.filter((category) => !favoriteIdsSet.has(category.id));

      const sectionsWithoutFavorites = categorizeBySections(nonFavoriteMatches).filter(
        (section) => section.categories.length > 0
      );

      const searchSection =
        nonFavoriteMatches.length > 0
          ? [
              {
                name: `Search Results (${matchingCategories.length})`,
                categories: nonFavoriteMatches.sort((a, b) => a.name.localeCompare(b.name)),
              },
            ]
          : [];

      const favoritesSection =
        favoriteMatches.length > 0
          ? [
              {
                name: `Favourites (${favoriteMatches.length})`,
                categories: favoriteMatches.sort((a, b) => a.name.localeCompare(b.name)),
              },
            ]
          : [];

      return [...favoritesSection, ...searchSection, ...sectionsWithoutFavorites];
    }

    // No search: put favourites at the top, then the regular sections
    const favouriteCategories = categories
      .filter((category) => favoriteIdsSet.has(category.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const sectionsWithoutFavorites = baseSections
      .map((section) => ({
        ...section,
        categories: section.categories.filter((category) => !favoriteIdsSet.has(category.id)),
      }))
      .filter((section) => section.categories.length > 0);

    if (favouriteCategories.length === 0) {
      return sectionsWithoutFavorites;
    }

    return [
      {
        name: `Favourites (${favouriteCategories.length})`,
        categories: favouriteCategories,
      },
      ...sectionsWithoutFavorites,
    ];
  };

  // Get total quantities
  const getTotals = () => {
    const totalSent = items.reduce((sum, item) => sum + item.quantity_sent, 0);
    const totalReceived = items.reduce((sum, item) => sum + item.quantity_received, 0);
    const totalAmount = items.reduce((sum, item) => {
      const baseAmount = item.subtotal;
      const surcharge = item.express_delivery ? baseAmount * 0.5 : 0;
      return sum + baseAmount + surcharge;
    }, 0);
    const itemsWithQuantity = items.filter(item => item.quantity_sent > 0).length;
    
    return { totalSent, totalReceived, totalAmount, itemsWithQuantity };
  };

  const totals = getTotals();
  const filteredSections = getFilteredSections();
  const searchText = searchQuery.trim().toLowerCase();
  const usingLayoutList = isEditingLayout || hasSavedLayout;
  const activeLayoutIds = isEditingLayout
    ? (draftLayoutIds ?? [])
    : hasSavedLayout && layoutCategoryIds
      ? layoutCategoryIds
      : [];

  const orderedLayoutCategories = activeLayoutIds
    .map((id) => categoryById.get(id))
    .filter((category): category is LinenCategory => Boolean(category));

  const visibleLayoutCategories = searchText
    ? orderedLayoutCategories.filter((category) => category.name.toLowerCase().includes(searchText))
    : orderedLayoutCategories;

  const layoutIdSet = new Set(hasSavedLayout && layoutCategoryIds ? layoutCategoryIds : []);
  const extraCategories = !isEditingLayout && hasSavedLayout
    ? categories.filter((category) => {
        if (layoutIdSet.has(category.id)) return false;
        const item = items.find((entry) => entry.category.id === category.id);
        if (!item || (item.quantity_sent <= 0 && item.quantity_received <= 0)) return false;
        if (searchText && !category.name.toLowerCase().includes(searchText)) return false;
        return true;
      })
    : [];

  const addableMatches = categories
    .filter((category) => {
      if (!isEditingLayout || !searchText) return false;
      if ((draftLayoutIds ?? []).includes(category.id)) return false;
      return category.name.toLowerCase().includes(searchText);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const addableCategories = addableMatches.slice(0, 12);

  const otherCategories = !isEditingLayout && hasSavedLayout
    ? categories.filter((category) => {
        if (layoutIdSet.has(category.id)) return false;
        if (searchText && !category.name.toLowerCase().includes(searchText)) return false;
        return true;
      })
    : [];
  const otherSections = categorizeBySections(otherCategories);
  const otherCategoryCount = otherSections.reduce((sum, section) => sum + section.categories.length, 0);

  const renderEntry = (category: LinenCategory, sortable: boolean) => {
    const item = items.find((entry) => entry.category.id === category.id);
    if (!item) return null;

    const entryProps: Omit<LinenEntryProps, 'dragHandle'> = {
      item,
      isFavorite: favoriteIdsSet.has(item.category.id),
      canToggleFavorite: Boolean(onToggleFavorite),
      isFocused: focusedCardId === item.category.id,
      isEditingLayout,
      validationErrors,
      onQuantityChange: handleQuantityChange,
      onDiscrepancyChange: handleDiscrepancyDetailsChange,
      onCopy: handleCopyQuantityToReceived,
      onClear: handleClearAllFields,
      onClearDiscrepancy: handleClearDiscrepancyDetails,
      onExpressToggle: handleExpressDeliveryToggle,
      onToggleFavorite,
      onFocus: handleCardClick,
      onRemoveFromLayout: isEditingLayout ? removeFromLayout : undefined,
    };

    const body = (dragHandle: DragHandleProps | null) =>
      viewMode === 'rows' ? (
        <LinenRow {...entryProps} dragHandle={dragHandle} />
      ) : (
        <LinenTile {...entryProps} dragHandle={dragHandle} />
      );

    if (!sortable) {
      return (
        <div key={category.id} className="h-full">
          {body(null)}
        </div>
      );
    }

    return (
      <SortableLinenEntry key={category.id} id={category.id}>
        {body}
      </SortableLinenEntry>
    );
  };

  const renderEntries = (list: LinenCategory[], sortable: boolean) => {
    const entries = list.map((category) => renderEntry(category, sortable));
    if (viewMode === 'rows') {
      return <LinenListTable>{entries}</LinenListTable>;
    }

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {entries}
      </div>
    );
  };

  const layoutList = isEditingLayout ? (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={visibleLayoutCategories.map((category) => category.id)}
        strategy={viewMode === 'rows' ? verticalListSortingStrategy : rectSortingStrategy}
      >
        {renderEntries(visibleLayoutCategories, true)}
      </SortableContext>
    </DndContext>
  ) : (
    renderEntries(visibleLayoutCategories, false)
  );

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Linen Count & Pricing</span>
          </CardTitle>
          <CardDescription>
            {hasSavedLayout
              ? "Enter quantities on this client's saved linen list. Other categories are underneath and can be added when needed."
              : 'Enter quantities for each linen category. Prices are fixed from category settings.'}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('tiles')}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${
                viewMode === 'tiles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
              aria-pressed={viewMode === 'tiles'}
            >
              <LayoutGrid className="h-4 w-4" />
              Tiles
            </button>
            <button
              type="button"
              onClick={() => setViewMode('rows')}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${
                viewMode === 'rows' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
              aria-pressed={viewMode === 'rows'}
            >
              <List className="h-4 w-4" />
              Rows
            </button>
          </div>
          {isEditingLayout ? (
            <>
              <Button type="button" size="sm" onClick={handleSaveLayout} disabled={isSavingLayout || (draftLayoutIds?.length ?? 0) === 0}>
                {isSavingLayout ? 'Saving...' : 'Save layout'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={cancelLayoutEdit} disabled={isSavingLayout}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={beginLayoutEdit}
              disabled={!onSaveLayout || categories.length === 0}
              title={onSaveLayout ? 'Arrange and save this client’s linen list' : 'Select a client to edit their layout'}
            >
              <Pencil className="h-4 w-4" />
              Edit layout
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{totals.totalSent}</p>
            <p className="text-xs sm:text-sm text-slate-600">Total Sent</p>
          </div>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{totals.totalReceived}</p>
            <p className="text-xs sm:text-sm text-slate-600">Total Received</p>
          </div>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{totals.itemsWithQuantity}</p>
            <p className="text-xs sm:text-sm text-slate-600">Categories Used</p>
          </div>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrencySSR(totals.totalAmount)}</p>
            <p className="text-xs sm:text-sm text-slate-600">Total Amount</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            type="text"
            placeholder={
              isEditingLayout
                ? 'Search to filter or add a category...'
                : hasSavedLayout
                  ? 'Search this list or other categories...'
                  : 'Search linen categories...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </p>
          </div>
        )}

        {/* Linen Categories by Section */}
        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, sectionIndex) => (
              <div key={sectionIndex} className="space-y-4">
                <div className="h-6 bg-slate-200 rounded w-32 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-10 bg-slate-200 rounded"></div>
                        <div className="h-10 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : usingLayoutList ? (
          <div className="space-y-4">
            {isEditingLayout && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Drag the handle to match the paper list. Remove items that are not on it, search to add others, then save.
                Quantities you have already entered stay on the items.
              </div>
            )}
            {layoutError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{layoutError}</div>
            )}
            {visibleLayoutCategories.length === 0 ? (
              <div className="py-8 text-center">
                <Search className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                <p className="text-sm text-slate-600">
                  {searchText
                    ? "No items on this list match your search."
                    : isEditingLayout
                      ? "This list is empty. Search for a category to add it."
                      : "This client's saved list has no matching categories."}
                </p>
              </div>
            ) : (
              layoutList
            )}
            {extraCategories.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-slate-900">Also on this batch</h3>
                  <div className="h-px flex-1 bg-slate-200"></div>
                  <span className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-500">
                    {extraCategories.length} items
                  </span>
                </div>
                {renderEntries(extraCategories, false)}
              </div>
            )}
            {!isEditingLayout && otherCategoryCount > 0 && (
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-slate-900">Other categories</h3>
                    <div className="h-px flex-1 bg-slate-200"></div>
                    <span className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-500">
                      {otherCategoryCount} items
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Not on this client&apos;s list. Add one when you need it, and it will sit under the saved list.
                  </p>
                </div>
                {otherSections.map((section) => (
                  <div key={section.name} className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-700">{section.name}</h4>
                    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                      {section.categories.map((category) => (
                        <li key={category.id} className="flex items-center justify-between gap-3 px-3 py-2">
                          <span className="text-sm text-slate-900">{category.name}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!onSaveLayout || addingCategoryId !== null}
                            onClick={() => addCategoryToClientList(category.id)}
                          >
                            {addingCategoryId === category.id ? 'Adding...' : 'Add to list'}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {isEditingLayout && searchText && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-medium text-slate-800">Add to this client's list</p>
                {addableCategories.length === 0 ? (
                  <p className="text-sm text-slate-600">No other categories match that search.</p>
                ) : (
                  <ul className="space-y-2">
                    {addableCategories.map((category) => (
                      <li key={category.id} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2">
                        <span className="text-sm text-slate-900">{category.name}</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => addToLayout(category.id)}>
                          Add
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {addableMatches.length > addableCategories.length && (
                  <p className="mt-2 text-xs text-slate-500">Keep typing to narrow the list.</p>
                )}
              </div>
            )}
            {isEditingLayout && !searchText && (
              <p className="text-sm text-slate-500">Search for a category to add it to this client's list.</p>
            )}
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {filteredSections.length === 0 && searchQuery ? (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No categories found</h3>
                <p className="text-slate-600">
                  No linen categories match your search for &quot;{searchQuery}&quot;. Try a different search term.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredSections.map((section) => (
                <div key={section.name} className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-slate-900">{section.name}</h3>
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {section.categories.length} items
                    </span>
                  </div>
                  {renderEntries(section.categories, false)}
                </div>
              ))
            )}
          </div>
        )}

        {/* No Items Warning */}
        {totals.itemsWithQuantity === 0 && !isLoading && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>No items have been added to this batch. Please enter quantities for at least one category.</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

LinenCountGrid.displayName = 'LinenCountGrid';

export default LinenCountGrid;
