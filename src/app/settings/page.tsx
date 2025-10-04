'use client';

import { Suspense, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/navigation';
import PricingCard from '@/components/settings/pricing-card';
import PricingSummary from '@/components/settings/pricing-summary';
import ClientsTable from '@/components/settings/clients-table';
import ClientForm, { ClientFormData } from '@/components/settings/client-form';
import ClientDetails from '@/components/settings/client-details';
import AddLinenCategoryForm from '@/components/settings/add-linen-category-form';
import SectionHeader from '@/components/settings/section-header';
import { categorizeBySections } from '@/lib/utils/category-sections';
import { 
  LayoutDashboard, 
  Settings, 
  User, 
  DollarSign, 
  Save, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Users,
  Plus as PlusIcon
} from 'lucide-react';
import Link from 'next/link';
import type { LinenCategory, Client, LinenCategoryFormData } from '@/types/database';

// Loading component
function SettingsLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-8">
          <div className="h-4 bg-slate-200 rounded w-48 animate-pulse"></div>
        </div>
        
        {/* Page header skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-slate-200 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-slate-200 rounded w-96 animate-pulse"></div>
        </div>

        {/* Settings cards skeleton */}
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-slate-200 rounded w-48"></div>
                <div className="h-4 bg-slate-200 rounded w-64"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-32"></div>
                  <div className="h-10 bg-slate-200 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-40"></div>
                  <div className="h-10 bg-slate-200 rounded"></div>
                </div>
                <div className="h-10 bg-slate-200 rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}


// Breadcrumb component
function Breadcrumb() {
  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-600 mb-8">
      <Link href="/dashboard" className="flex items-center space-x-1 hover:text-slate-900 transition-colors">
        <LayoutDashboard className="w-4 h-4" />
        <span>Dashboard</span>
      </Link>
      <span>/</span>
      <span className="text-slate-900 font-medium">Settings</span>
    </nav>
  );
}

// Main settings content
function SettingsContent() {
  const [categories, setCategories] = useState<LinenCategory[]>([]);
  const [updatedPrices, setUpdatedPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pricing');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Initialize with all sections expanded by default
    return {
      'Front of House': true,
      'Kitchen': true,
      'Housekeeping': true,
      'Other': true,
    };
  });
  
  // Client management state
  const [clientsView, setClientsView] = useState<'list' | 'form' | 'details'>('list');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientSuccess, setClientSuccess] = useState<string | null>(null);

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/categories');
        const result = await response.json();
        
        if (result.success) {
          setCategories(result.data);
        } else {
          // Fallback to mock data if API fails
          const mockCategories: LinenCategory[] = [
            { id: '1', name: 'BATH TOWELS', price_per_item: 2.50, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '2', name: 'HAND TOWELS', price_per_item: 1.25, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '3', name: 'FACE TOWELS', price_per_item: 0.75, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '4', name: 'SINGLE FITTED SHEET', price_per_item: 3.00, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '5', name: 'KING FITTED SHEET', price_per_item: 4.50, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '6', name: 'SINGLE DUVET COVER', price_per_item: 4.00, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '7', name: 'KING DUVET COVER', price_per_item: 6.00, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '8', name: 'DUVET INNER SINGLE', price_per_item: 5.00, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '9', name: 'DUVET INNER KING', price_per_item: 7.50, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '10', name: 'SMALL PILLOWS', price_per_item: 2.00, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '11', name: 'SMALL PILLOW CASES', price_per_item: 1.50, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '12', name: 'PILLOW PROTECTORS', price_per_item: 1.00, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '13', name: 'MATT PROTECTORS (K)', price_per_item: 3.50, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '14', name: 'MATT PROTECTORS (S)', price_per_item: 2.50, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '15', name: 'WATERPROOF MATTRESS PROTECTOR', price_per_item: 4.00, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '16', name: 'SHOWER MATS', price_per_item: 1.75, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '17', name: 'SINGLE FLEECE', price_per_item: 2.25, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: '18', name: 'DOUBLE FLEECE', price_per_item: 3.25, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          ];
          setCategories(mockCategories);
          setErrorMessage('Failed to load categories from API, using mock data');
          setSaveStatus('error');
        }
      } catch {
        setErrorMessage('Failed to load categories');
        setSaveStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handlePriceChange = (id: string, price: number) => {
    setUpdatedPrices(prev => ({
      ...prev,
      [id]: price
    }));
  };

  const handleSaveChanges = async () => {
    if (Object.keys(updatedPrices).length === 0) return;

    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');
    
    try {
      // Create array of update promises
      const updatePromises = Object.entries(updatedPrices).map(async ([categoryId, newPrice]) => {
        const response = await fetch(`/api/categories/${categoryId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            price_per_item: newPrice
          }),
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(`Failed to update ${categoryId}: ${result.error}`);
        }

        return { categoryId, updatedCategory: result.data };
      });

      // Execute all updates
      const results = await Promise.all(updatePromises);
      
      // Update local state with the updated categories
      setCategories(prev => prev.map(cat => {
        const update = results.find(r => r.categoryId === cat.id);
        return update ? update.updatedCategory : cat;
      }));
      
      setUpdatedPrices({});
      setSaveStatus('success');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving price changes:', error);
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      
      if (result.success) {
        setCategories(result.data);
        setUpdatedPrices({});
        setSaveStatus('idle');
      } else {
        setErrorMessage('Failed to refresh categories');
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error refreshing categories:', error);
      setErrorMessage('Failed to refresh data');
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = Object.keys(updatedPrices).length > 0;

  // Toggle section expansion
  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Client management functions
  const handleAddClient = () => {
    setSelectedClient(null);
    setClientsView('form');
    setClientError(null);
    setClientSuccess(null);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setClientsView('form');
    setClientError(null);
    setClientSuccess(null);
  };

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setClientsView('details');
    setClientError(null);
    setClientSuccess(null);
  };

  const handleBackToClients = () => {
    setClientsView('list');
    setSelectedClient(null);
    setClientError(null);
    setClientSuccess(null);
  };

  const handleSaveClient = async (clientData: ClientFormData) => {
    try {
      setClientError(null);
      setClientSuccess(null);

      const url = selectedClient ? `/api/clients/${selectedClient.id}` : '/api/clients';
      const method = selectedClient ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      const result = await response.json();

      if (result.success) {
        setClientSuccess(selectedClient ? 'Client updated successfully!' : 'Client created successfully!');
        setTimeout(() => {
          handleBackToClients();
        }, 1500);
      } else {
        setClientError(result.error || 'Failed to save client');
      }
    } catch {
      setClientError('Failed to save client. Please try again.');
    }
  };

  // Add new category function
  const handleAddCategory = async (categoryData: LinenCategoryFormData) => {
    setIsAddingCategory(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      const result = await response.json();

      if (result.success) {
        // Add new category to the list
        setCategories(prev => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
        setShowAddForm(false);
        setSaveStatus('success');
        setErrorMessage('');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        setErrorMessage(result.error || 'Failed to add category');
      }
    } catch {
      setSaveStatus('error');
      setErrorMessage('Failed to add category. Please try again.');
    } finally {
      setIsAddingCategory(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <span>Settings</span>
          </h1>
          <p className="text-slate-600 mt-2">
            Manage your account preferences, system configuration, and application settings.
          </p>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-8">
              <button 
                onClick={() => setActiveTab('pricing')}
                className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'pricing' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Pricing Management
              </button>
              <button 
                onClick={() => setActiveTab('clients')}
                className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'clients' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Client Management
              </button>
              <button 
                onClick={() => setActiveTab('account')}
                className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'account' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Account Settings
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'notifications' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Notifications
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'security' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Security
              </button>
            </nav>
          </div>
        </div>

        {/* Pricing Management Section */}
        {activeTab === 'pricing' && (
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <DollarSign className="w-6 h-6 text-blue-600" />
                <span>Linen Category Pricing</span>
              </h2>
              <p className="text-slate-600 mt-1">
                Manage pricing for all linen categories. Changes are saved automatically and applied to new batches.
              </p>
            </div>

            {/* Save Status Messages */}
            {saveStatus === 'success' && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800">All changes saved successfully!</span>
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">{errorMessage}</span>
              </div>
            )}

            {/* Pricing Summary Card */}
            <div className="mb-6">
              <PricingSummary 
                categories={categories} 
                updatedPrices={updatedPrices} 
                hasChanges={hasChanges} 
                isUpdating={isSaving} 
                lastUpdated={categories[0]?.updated_at}
              />
            </div>

            {/* Add New Category Form */}
            {showAddForm && (
              <AddLinenCategoryForm
                onAdd={handleAddCategory}
                onCancel={() => setShowAddForm(false)}
                isSubmitting={isAddingCategory}
              />
            )}

            {/* Categories Grid */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Category Pricing</h3>
                <div className="flex items-center space-x-2">
                  {!showAddForm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddForm(true)}
                      disabled={isLoading || isSaving || isAddingCategory}
                      className="flex items-center space-x-2"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Add Category</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading || isSaving || isAddingCategory}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    onClick={handleSaveChanges}
                    disabled={!hasChanges || isSaving || isAddingCategory}
                    className="flex items-center space-x-2"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </Button>
                </div>
              </div>
              
              {/* Categories List - Sectioned Layout */}
              {isLoading ? (
                <div className="space-y-6">
                  {/* Loading skeleton for sections */}
                  {Array.from({ length: 3 }).map((_, sectionIndex) => (
                    <div key={sectionIndex} className="space-y-4">
                      <div className="h-16 bg-slate-200 rounded animate-pulse"></div>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="space-y-3 flex-1">
                                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                              </div>
                              <div className="h-10 bg-slate-200 rounded w-32"></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {categorizeBySections(categories).map((section) => (
                    <div key={section.name}>
                      <SectionHeader 
                        title={section.name} 
                        count={section.categories.length}
                        isExpanded={expandedSections[section.name] || false}
                        onToggle={() => toggleSection(section.name)}
                      />
                      <div className={`transition-all duration-300 overflow-hidden ${
                        expandedSections[section.name] 
                          ? 'max-h-screen opacity-100' 
                          : 'max-h-0 opacity-0'
                      }`}>
                        <div className="space-y-4">
                          {section.categories.map((category) => (
                            <PricingCard
                              key={category.id}
                              category={category}
                              onPriceChange={handlePriceChange}
                              isUpdating={isSaving}
                              hasError={false}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Client Management Section */}
        {activeTab === 'clients' && (
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-6 h-6 text-blue-600" />
                <span>Client Management</span>
              </h2>
              <p className="text-slate-600 mt-1">
                Manage your clients, add new ones, and update their information and contact details.
              </p>
            </div>

            {/* Client Success/Error Messages */}
            {clientSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800">{clientSuccess}</span>
              </div>
            )}

            {clientError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">{clientError}</span>
              </div>
            )}

            {/* Client Views */}
            {clientsView === 'list' && (
              <ClientsTable
                onAddClient={handleAddClient}
                onEditClient={handleEditClient}
                onViewClient={handleViewClient}
              />
            )}

            {clientsView === 'form' && (
              <ClientForm
                client={selectedClient}
                onSave={handleSaveClient}
                onCancel={handleBackToClients}
              />
            )}

            {clientsView === 'details' && selectedClient && (
              <ClientDetails
                client={selectedClient}
                onEdit={() => handleEditClient(selectedClient)}
                onBack={handleBackToClients}
              />
            )}
          </div>
        )}

        {/* Reports moved to top navigation at /reports */}

        {/* Other Settings Sections */}
        {activeTab !== 'pricing' && activeTab !== 'clients' && (
          <div className="space-y-6">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Profile Settings</span>
                </CardTitle>
                <CardDescription>
                  Manage your personal information and account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      defaultValue="Admin"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      defaultValue="User"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    defaultValue="admin@rslexpress.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="company" className="text-sm font-medium text-slate-700">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    defaultValue="RSL Express"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <Button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Update Profile
                </Button>
              </CardContent>
            </Card>

            {/* Additional settings cards would go here */}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsContent />
    </Suspense>
  );
}