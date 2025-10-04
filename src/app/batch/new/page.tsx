'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/navigation';
import ClientInfoForm from '@/components/batch/client-info-form';
import LinenCountGrid, { LinenCountGridRef } from '@/components/batch/linen-count-grid';
import BatchTotalCard from '@/components/batch/batch-total-card';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ArrowLeft, 
  Save, 
  X,
  AlertCircle,
  Calendar,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Client, LinenCategory } from '@/types/database';

// Loading component
function NewBatchLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-8">
          <div className="h-4 bg-slate-200 rounded w-64 animate-pulse"></div>
        </div>
        
        {/* Page header skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-slate-200 rounded w-80 mb-2 animate-pulse"></div>
          <div className="h-4 bg-slate-200 rounded w-96 animate-pulse"></div>
        </div>

        {/* Form skeleton */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-slate-200 rounded w-48"></div>
            <div className="h-4 bg-slate-200 rounded w-64"></div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-24"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-32"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-28"></div>
              <div className="h-24 bg-slate-200 rounded"></div>
            </div>
            <div className="flex space-x-4">
              <div className="h-10 bg-slate-200 rounded w-24"></div>
              <div className="h-10 bg-slate-200 rounded w-32"></div>
            </div>
          </CardContent>
        </Card>
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
      <Link href="/batch" className="hover:text-slate-900 transition-colors">
        <span>Batches</span>
      </Link>
      <span>/</span>
      <span className="text-slate-900 font-medium">New Batch</span>
    </nav>
  );
}

// Main new batch content
function NewBatchContent() {
  const router = useRouter();
  const linenGridRef = useRef<LinenCountGridRef>(null);
  
  // State management
  const [paperBatchId, setPaperBatchId] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [pickupDate, setPickupDate] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<LinenCategory[]>([]);
  const [linenItems, setLinenItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<'draft' | 'ready' | 'creating' | 'success' | 'error'>('draft');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load categories on component mount
  useEffect(() => {
    setIsClient(true);
    
    // Set default pickup date after client-side hydration
    if (!pickupDate) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setPickupDate(`${yyyy}-${mm}-${dd}`);
    }

    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories?includeInactive=false');
        const result = await response.json();
        
        if (result.success) {
          setCategories(result.data || []);
        } else {
          setErrorMessage('Failed to load linen categories');
        }
      } catch {
        setErrorMessage('Failed to load linen categories');
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Auto-fill Paper Batch ID from API if empty
  useEffect(() => {
    const suggestPaperId = async () => {
      try {
        if (paperBatchId.trim()) return;
        const res = await fetch('/api/batches/next-paper-id');
        const json = await res.json();
        if (json.success && json.data?.id) {
          setPaperBatchId(json.data.id);
        }
      } catch {
        // ignore suggestion failures
      }
    };
    suggestPaperId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate form data
  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Paper Batch ID is optional; DB will auto-generate when blank

    if (!selectedClient) {
      errors.client = 'Client must be selected';
    }

    if (!pickupDate) {
      errors.pickupDate = 'Pickup date is required';
    } else {
      const date = new Date(pickupDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        errors.pickupDate = 'Pickup date cannot be in the past';
      }
    }

    const itemsWithQuantity = linenItems.filter(item => item.quantity_sent > 0);
    if (itemsWithQuantity.length === 0) {
      errors.items = 'At least one category must have quantities';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleCreateBatch = async () => {
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    setCreateStatus('creating');
    setErrorMessage('');

    try {
      // Get current items from the grid
      const currentItems = linenGridRef.current?.getItems() || [];
      
      // Prepare batch data
      const batchData = {
        paper_batch_id: paperBatchId.trim() || undefined,
        client_id: selectedClient!.id,
        pickup_date: pickupDate,
        status: 'pickup',
        notes: notes.trim() || null,
        items: currentItems
          .filter(item => item.quantity_sent > 0)
          .map(item => ({
            linen_category_id: item.category.id,
            quantity_sent: item.quantity_sent,
            quantity_received: item.quantity_received,
            price_per_item: item.price_per_item,
            discrepancy_details: item.discrepancy_details || null,
          }))
      };

      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchData),
      });

      const result = await response.json();

      if (result.success) {
        setCreateStatus('success');
        // Redirect to batch details after a short delay
        setTimeout(() => {
          router.push(`/batch/${result.data.id}`);
        }, 2000);
      } else {
        setCreateStatus('error');
        setErrorMessage(result.error || 'Failed to create batch');
      }
    } catch {
      setCreateStatus('error');
      setErrorMessage('Failed to create batch. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle linen items change
  const handleLinenItemsChange = useCallback((items: any[]) => {
    setLinenItems(items);
  }, []);

  // Get current items from the grid
  const getCurrentItems = () => {
    return linenGridRef.current?.getItems() || [];
  };

  // Check if form is ready
  const isFormReady = () => {
    const currentItems = getCurrentItems();
    return (
      selectedClient &&
      pickupDate &&
      currentItems.some(item => item.quantity_sent > 0)
    );
  };

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return <NewBatchLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              href="/dashboard"
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
            <PlusCircle className="w-8 h-8 text-blue-600" />
            <span>Create New Batch</span>
          </h1>
          <p className="text-slate-600 mt-2">
            Set up a new linen batch for tracking and management. Configure batch details, assign items, and set up tracking parameters.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Left Column - Form */}
          <div className="xl:col-span-3 space-y-6">
            {/* Batch Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Batch Information</span>
                </CardTitle>
                <CardDescription>
                  Provide the essential details for your new linen batch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Paper Batch ID */}
                <div className="space-y-2">
                  <label htmlFor="paperBatchId" className="text-sm font-medium text-slate-700">
                    Paper Batch ID (optional)
                  </label>
                  <Input
                    id="paperBatchId"
                    type="text"
                    placeholder="e.g., PB-2024-006"
                    value={paperBatchId}
                    onChange={(e) => setPaperBatchId(e.target.value)}
                    className={validationErrors.paperBatchId ? 'border-red-300' : ''}
                    disabled={isCreating}
                  />
                  {/* Paper Batch ID is optional; no validation error shown */}
                </div>

                {/* Pickup Date */}
                <div className="space-y-2">
                  <label htmlFor="pickupDate" className="text-sm font-medium text-slate-700">
                    Pickup Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="pickupDate"
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className={`pl-10 ${validationErrors.pickupDate ? 'border-red-300' : ''}`}
                      disabled={isCreating}
                    />
                  </div>
                  {validationErrors.pickupDate && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{validationErrors.pickupDate}</span>
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label htmlFor="notes" className="text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    placeholder="Additional details about this batch..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={isCreating}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Client Information */}
            <ClientInfoForm
              selectedClient={selectedClient}
              onClientSelect={setSelectedClient}
              onClientCreate={() => {}} // Handle client creation if needed
              isLoading={isCreating}
              error={validationErrors.client}
            />

            {/* Linen Count Grid */}
            <LinenCountGrid
              ref={linenGridRef}
              categories={categories}
              onItemsChange={handleLinenItemsChange}
              isLoading={isLoading}
              error={validationErrors.items}
            />
          </div>

          {/* Right Column - Batch Total */}
          <div className="xl:col-span-1">
            <div className="sticky top-8">
              <BatchTotalCard
                items={getCurrentItems()}
                paperBatchId={paperBatchId}
                clientName={selectedClient?.name}
                pickupDate={pickupDate}
                status={createStatus}
                errorMessage={errorMessage}
              />

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleCreateBatch}
                  disabled={!isFormReady() || isCreating}
                  className="w-full flex items-center justify-center space-x-2"
                  size="lg"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Batch...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Create Batch</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  disabled={isCreating}
                  className="w-full"
                  size="lg"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>

              {/* Form Status */}
              {!isFormReady() && createStatus === 'draft' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Complete all required fields to create batch</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewBatchPage() {
  return (
    <Suspense fallback={<NewBatchLoading />}>
      <NewBatchContent />
    </Suspense>
  );
}
