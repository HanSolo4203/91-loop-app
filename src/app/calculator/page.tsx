'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import NumericKeypad from '@/components/ui/numeric-keypad';
import { LinenCategory } from '@/types/database';
import { Search, Plus, FileText, Mail, Trash2, ArrowLeft } from 'lucide-react';
import { pdfGenerator } from '@/lib/services/pdf-generator';
import Link from 'next/link';

interface CalculatorItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export default function QuickCalculatorPage() {
  const [categories, setCategories] = useState<LinenCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LinenCategory | null>(null);
  const [quantity, setQuantity] = useState('');
  const [items, setItems] = useState<CalculatorItem[]>([]);
  const [customerName, setCustomerName] = useState('RSL Express Services');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmailSending, setIsEmailSending] = useState(false);

  // Load categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const result = await response.json();
        
        if (result.success) {
          setCategories(result.data);
        } else {
          setError('Failed to load categories');
        }
      } catch (err) {
        setError('Failed to load categories');
        console.error('Error loading categories:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Filter categories based on search term
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    category.is_active
  );

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const vat = subtotal * 0.15; // 15% VAT
  const total = subtotal + vat;

  // Add item to calculator
  const handleAddItem = () => {
    if (!selectedCategory || !quantity || parseInt(quantity) <= 0) {
      return;
    }

    const existingItemIndex = items.findIndex(item => item.id === selectedCategory.id);
    const itemQuantity = parseInt(quantity);
    const itemSubtotal = itemQuantity * selectedCategory.price_per_item;

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += itemQuantity;
      updatedItems[existingItemIndex].subtotal = updatedItems[existingItemIndex].quantity * selectedCategory.price_per_item;
      setItems(updatedItems);
    } else {
      // Add new item
      const newItem: CalculatorItem = {
        id: selectedCategory.id,
        name: selectedCategory.name,
        quantity: itemQuantity,
        price: selectedCategory.price_per_item,
        subtotal: itemSubtotal
      };
      setItems([...items, newItem]);
    }

    // Reset selection
    setSelectedCategory(null);
    setQuantity('');
  };

  // Remove item from calculator
  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  // Clear selected category
  const handleClearSelection = () => {
    setSelectedCategory(null);
    setQuantity('');
  };

  // Handle keypad input
  const handleKeypadChange = (value: string) => {
    setQuantity(value);
  };

  // Handle category selection
  const handleCategorySelect = (category: LinenCategory) => {
    setSelectedCategory(category);
    setSearchTerm(''); // Reset search field
  };

  // Generate PDF
  const handleGeneratePDF = () => {
    if (items.length === 0) {
      alert('Please add items before generating a PDF');
      return;
    }

    pdfGenerator.generateQuotation({
      customerName,
      customerEmail,
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      })),
      subtotal,
      vatAmount: vat,
      total
    });
  };

  // Email PDF
  const handleEmailPDF = async () => {
    if (items.length === 0) {
      alert('Please add items before sending a quotation');
      return;
    }

    if (!customerEmail) {
      alert('Please enter customer email address');
      return;
    }

    setIsEmailSending(true);
    setError(null);

    try {
      const quotationNumber = `RSL-${new Date().getFullYear()}-Q${Date.now().toString().slice(-6)}`;
      
      const response = await fetch('/api/email-quotation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName,
          customerEmail,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal
          })),
          subtotal,
          vatAmount: vat,
          total,
          quotationNumber
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Quotation sent successfully!');
        // Clear the form
        setItems([]);
        setCustomerName('RSL Express Services');
        setCustomerEmail('');
      } else {
        setError(result.error || 'Failed to send email');
      }
    } catch (err) {
      console.error('Email error:', err);
      setError('Failed to send email. Please try again.');
    } finally {
      setIsEmailSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading calculator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Quick Calculator</h1>
              <p className="text-slate-600 mt-1">Calculate linen service costs quickly and efficiently</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Summary */}
        <div className="sm:hidden mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-slate-500">Total Items</p>
                <p className="text-xl font-bold text-blue-600">{items.length}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Value</p>
                <p className="text-xl font-bold text-green-600">R{total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Input Section */}
          <div className="space-y-6">
            {/* Search Bar */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Item Selection</h2>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search linen categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Results */}
              {searchTerm && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-slate-900">{category.name}</div>
                        <div className="text-sm text-slate-600">R{category.price_per_item.toFixed(2)} per item</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-slate-500 text-sm">No categories found</div>
                  )}
                </div>
              )}

              {/* Selected Category Display */}
              {selectedCategory && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900">{selectedCategory.name}</div>
                      <div className="text-sm text-blue-700">R{selectedCategory.price_per_item.toFixed(2)} per item</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelection}
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Quantity Input */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Quantity</h2>
              
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl font-mono"
                />
              </div>

              <NumericKeypad
                value={quantity}
                onChange={handleKeypadChange}
                maxLength={6}
              />
            </Card>

            {/* Add Item Button */}
            <Button
              onClick={handleAddItem}
              disabled={!selectedCategory || !quantity || parseInt(quantity) <= 0}
              className="w-full h-12 text-lg font-semibold"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Item
            </Button>
          </div>

          {/* Right Side - Invoice Section */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Customer Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer Name
                  </label>
                  <Input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer Email
                  </label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Enter customer email"
                  />
                </div>
              </div>
            </Card>

            {/* Items Table */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Invoice Items</h2>
              
              {items.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">R{item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">R{item.subtotal.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No items added yet</p>
                  <p className="text-sm">Add items from the left panel to create an invoice</p>
                </div>
              )}
            </Card>

            {/* Totals */}
            {items.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Invoice Summary</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>R{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>VAT (15%):</span>
                    <span>R{vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold text-slate-900 border-t border-slate-200 pt-3">
                    <span>Total:</span>
                    <span>R{total.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            {items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={handleGeneratePDF}
                  variant="outline"
                  className="h-12 text-base font-semibold"
                  size="lg"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  View PDF
                </Button>
                
                <Button
                  onClick={handleEmailPDF}
                  disabled={isEmailSending}
                  className="h-12 text-base font-semibold"
                  size="lg"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  {isEmailSending ? 'Sending...' : 'Email Quotation'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
