'use client';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import TabletNumericInput from '@/components/ui/tablet-numeric-input';
import { Package, Calculator, AlertCircle, CheckCircle, Search, Star, X, Copy, Trash2, RotateCcw, Zap } from 'lucide-react';
import { formatCurrencySSR } from '@/lib/utils/formatters';
import { categorizeBySections } from '@/lib/utils/category-sections';
import type { LinenCategory } from '@/types/database';

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
}

export interface LinenCountGridRef {
  getItems: () => LinenCountItem[];
}

const LinenCountGrid = forwardRef<LinenCountGridRef, LinenCountGridProps>(({
  categories,
  onItemsChange,
  isLoading = false,
  error,
  initialSelections,
  favoriteCategoryIds = [],
  onToggleFavorite,
}, ref) => {
  const [items, setItems] = useState<LinenCountItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const onItemsChangeRef = useRef(onItemsChange);
  const normalizedInitialSelections = useMemo(() => initialSelections ?? [], [initialSelections]);
  const favoriteIdsSet = useMemo(() => new Set(favoriteCategoryIds), [favoriteCategoryIds]);

  // Update the ref when the callback changes
  useEffect(() => {
    onItemsChangeRef.current = onItemsChange;
  }, [onItemsChange]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getItems: () => items
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="w-5 h-5 text-blue-600" />
          <span>Linen Count & Pricing</span>
        </CardTitle>
        <CardDescription>
          Enter quantities for each linen category. Prices are fixed from category settings.
        </CardDescription>
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
            placeholder="Search linen categories..."
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
                  {/* Section Header */}
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-slate-900">{section.name}</h3>
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {section.categories.length} items
                    </span>
                  </div>

                  {/* Categories Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                    {section.categories.map((category) => {
                      const item = items.find(i => i.category.id === category.id);
                      if (!item) return null;
                      
                      const hasDiscrepancy = item.quantity_sent !== item.quantity_received;
                      const hasQuantity = item.quantity_sent > 0;
                      const isFavorite = favoriteIdsSet.has(item.category.id);
                      const canToggleFavorite = Boolean(onToggleFavorite);
                      
                      const isCardFocused = focusedCardId === item.category.id;
                      
                      return (
                        <div
                          key={item.category.id}
                          data-card-id={item.category.id}
                          className={`p-3 sm:p-4 lg:p-5 border rounded-lg transition-all cursor-pointer touch-manipulation ${
                            hasDiscrepancy ? 'border-orange-200 bg-orange-50' :
                            hasQuantity ? 'border-blue-200 bg-blue-50' :
                            'border-slate-200 hover:border-slate-300'
                          } ${isCardFocused ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                          onClick={() => handleCardClick(item.category.id)}
                          tabIndex={0}
                        >
                          <div className="space-y-3">
                            {/* Category Name */}
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-slate-900 text-sm leading-tight">
                                {item.category.name}
                              </h4>
                              <div className="flex items-center space-x-2">
                                {canToggleFavorite && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleFavorite?.(item.category.id, !isFavorite);
                                    }}
                                    className={`p-1 rounded-full transition-colors ${
                                      isFavorite
                                        ? 'text-amber-500 hover:text-amber-600 bg-amber-50'
                                        : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                                    }`}
                                    aria-label={isFavorite ? 'Remove favourite' : 'Mark as favourite'}
                                  >
                                    <Star
                                      className="w-4 h-4"
                                      fill={isFavorite ? 'currentColor' : 'none'}
                                    />
                                  </button>
                                )}
                                {item.discrepancy_details && (
                                  <button
                                    onClick={() => handleClearDiscrepancyDetails(item.category.id)}
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Clear discrepancy details"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                                {hasDiscrepancy && (
                                  <Badge variant="destructive" className="text-xs">
                                    Discrepancy
                                  </Badge>
                                )}
                                {hasQuantity && !hasDiscrepancy && (
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Complete
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Price Display */}
                            <div className="flex items-center space-x-2">
                              <Calculator className="w-4 h-4 text-slate-500" />
                              <span className="text-sm text-slate-600">
                                Price: {formatCurrencySSR(item.price_per_item)}
                              </span>
                            </div>

                            {/* Quantity Inputs */}
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700">
                                  Quantity Sent
                                </label>
                                <TabletNumericInput
                                  value={item.quantity_sent.toString()}
                                  onChange={(value) => handleQuantityChange(item.category.id, 'sent', value)}
                                  placeholder="0"
                                  maxLength={5}
                                  className={`text-sm ${
                                    validationErrors[`${item.category.id}-sent`] ? 'border-red-300' : ''
                                  }`}
                                />
                                {validationErrors[`${item.category.id}-sent`] && (
                                  <p className="text-xs text-red-600">
                                    {validationErrors[`${item.category.id}-sent`]}
                                  </p>
                                )}
                              </div>

                              {/* Action Buttons - show when card is focused */}
                              {isCardFocused && (
                                <div className="flex justify-center space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyQuantityToReceived(item.category.id);
                                    }}
                                    className={`flex items-center space-x-1 px-3 py-2 text-xs rounded-md transition-colors touch-manipulation min-h-[44px] ${
                                      item.quantity_sent > 0
                                        ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                    title="Copy quantity sent to received"
                                    disabled={item.quantity_sent === 0}
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClearAllFields(item.category.id);
                                    }}
                                    className="flex items-center space-x-1 px-3 py-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors touch-manipulation min-h-[44px]"
                                    title="Clear all fields"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Clear</span>
                                  </button>
                                </div>
                              )}

                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700">
                                  Quantity Received
                                </label>
                                <TabletNumericInput
                                  value={item.quantity_received.toString()}
                                  onChange={(value) => handleQuantityChange(item.category.id, 'received', value)}
                                  placeholder="0"
                                  maxLength={5}
                                  className={`text-sm ${
                                    validationErrors[`${item.category.id}-received`] ? 'border-red-300' : ''
                                  }`}
                                />
                                {validationErrors[`${item.category.id}-received`] && (
                                  <p className="text-xs text-red-600">
                                    {validationErrors[`${item.category.id}-received`]}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Express Delivery Checkbox */}
                            <div className="pt-2 border-t border-slate-200">
                              <label className={`flex items-center space-x-2 cursor-pointer group ${item.quantity_sent === 0 ? 'opacity-70' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={item.express_delivery || false}
                                  onChange={(e) => handleExpressDeliveryToggle(item.category.id, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 disabled:cursor-not-allowed"
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={item.quantity_sent === 0}
                                />
                                <div className="flex items-center space-x-1">
                                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                                  <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                                    Express Delivery (+50%)
                                  </span>
                                </div>
                              </label>
                            </div>

                            {/* Subtotal */}
                            <div className="pt-2 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">Subtotal:</span>
                                <span className="text-sm font-bold text-slate-900">
                                  {formatCurrencySSR(item.subtotal)}
                                </span>
                              </div>
                              {item.express_delivery && (
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-slate-600">Surcharge (50%):</span>
                                  <span className="text-xs font-semibold text-yellow-600">
                                    {formatCurrencySSR(item.subtotal * 0.5)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Discrepancy Warning and Details */}
                            {hasDiscrepancy && (
                              <div className="space-y-3">
                                <div className="p-2 bg-orange-100 border border-orange-200 rounded text-xs">
                                  <p className="text-orange-800">
                                    <strong>Discrepancy:</strong> {item.quantity_sent} sent, {item.quantity_received} received
                                    ({item.quantity_sent - item.quantity_received > 0 ? '+' : ''}{item.quantity_sent - item.quantity_received})
                                  </p>
                                </div>
                                
                                {/* Discrepancy Details Input */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-slate-700">
                                    What caused this discrepancy?
                                  </label>
                                  <Textarea
                                    placeholder="e.g., Items damaged during washing, items lost, incorrect count..."
                                    value={item.discrepancy_details || ''}
                                    onChange={(e) => handleDiscrepancyDetailsChange(item.category.id, e.target.value)}
                                    className="text-xs min-h-[60px] resize-none"
                                    maxLength={500}
                                  />
                                  <p className="text-xs text-slate-500">
                                    {(item.discrepancy_details || '').length}/500 characters
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
