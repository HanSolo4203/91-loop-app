'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Navigation from '@/components/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { 
  Radio, 
  Upload, 
  FileSpreadsheet,
  TrendingUp,
  Package,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Download,
  DollarSign,
  ShoppingBag,
  CreditCard,
  XCircle,
  Wrench,
  Shield,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import { getCategoryPrice, formatPrice } from '@/lib/constants/rfid-pricing';
import type { RFIDDataInsert } from '@/types/database';

// Dynamic imports for heavy libraries
const ManualEntryForm = dynamic(() => import('@/components/rfid/manual-entry-form'), {
  loading: () => <div className="p-4 text-center text-slate-500">Loading form...</div>,
  ssr: false,
});

// Lazy load chart components
import RFIDCharts from '@/components/rfid/rfid-charts';

// Type for parsed CSV data
interface RFIDRecord {
  'RFID Number'?: string;
  'Category'?: string;
  'Status'?: string;
  'Condition'?: string;
  'Location'?: string;
  'User'?: string;
  'QTY Washed'?: string;
  'Washes Remaining'?: string;
  'Assigned Location'?: string;
  'Date Assigned'?: string;
  'Date/Time'?: string;
  [key: string]: string | number | undefined;
}

// Type for database RFID data
interface DatabaseRFIDRecord {
  id: string;
  rfid_number: string;
  category: string;
  status: string;
  condition: string | null;
  location: string | null;
  user_name: string | null;
  qty_washed: number | null | undefined;
  washes_remaining: number | null | undefined;
  assigned_location: string | null;
  date_assigned: string | null;
  date_time: string | null;
  created_at: string;
  updated_at: string;
}

interface BillingItem extends RFIDRecord {
  calculatedPrice: number;
}

interface ProcessedData {
  byStatus: { name: string; value: number }[];
  byCategory: { name: string; value: number }[];
  byCondition: { name: string; value: number }[];
  byLocation: { name: string; value: number }[];
  byAssignedLocation: { name: string; value: number }[];
  timeSeriesData: { time: string; count: number }[];
  totalItems: number;
  uniqueRFIDs: number;
  avgWashesRemaining: number;
  totalWashed: number;
  fileName: string;
  billing: {
    itemsAtLaundry: number;
    washedItems: number;
    billableItems: number;
    totalBilling: number;
    toBeReturned: number;
    laundryItems: BillingItem[];
    washedItemsList: BillingItem[];
  };
  stockHealth: {
    condemnedItems: number;
    needsRepair: number;
    lostStolen: number;
    totalLosses: number;
    condemnedPercent: number;
    needsRepairPercent: number;
    lostStolenPercent: number;
    totalLossesPercent: number;
  };
  inventory: {
    totalAvailable: number;
    totalInUse: number;
    avgAvailability: number;
    categoryBreakdown: Array<{
      category: string;
      total: number;
      available: number;
      inUse: number;
      atLaundry: number;
      damagedLost: number;
      availabilityPercent: number;
    }>;
  };
}

// Breadcrumb component
function Breadcrumb() {
  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-600 mb-8">
      <Radio className="w-4 h-4" />
      <span>/</span>
      <span className="text-slate-900 font-medium">RFID Dashboard</span>
    </nav>
  );
}

// CSV Upload Component
function CSVUploadZone({ 
  onDataParsed, 
  isLoading, 
  error 
}: { 
  onDataParsed: (data: RFIDRecord[], fileName: string) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);
    setUploadError(null);

    try {
      // Dynamic import of papaparse - only loaded when CSV parsing is needed
      const Papa = (await import('papaparse')).default;
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(), // Trim whitespace from headers
        transform: (value: string) => value.trim(), // Trim whitespace from values
        complete: (results) => {
          setIsProcessing(false);
          
          if (results.errors.length > 0) {
            const criticalErrors = results.errors.filter(err => err.type === 'Quotes' || err.type === 'FieldMismatch');
            if (criticalErrors.length > 0) {
              setUploadError(`CSV parsing error: ${criticalErrors[0].message}`);
              return;
            }
          }

          // Filter out completely empty rows
          const cleanedData = (results.data as RFIDRecord[]).filter(row => {
            return Object.values(row).some(value => {
              if (typeof value === 'string') {
                return value.trim() !== '';
              }
              return value !== undefined && value !== null;
            });
          });

          if (cleanedData.length === 0) {
            setUploadError('CSV file is empty or contains no valid data');
            return;
          }

          // Validate required columns
          const requiredColumns = ['RFID Number', 'Category', 'Status'];
          const firstRow = cleanedData[0];
          const missingColumns = requiredColumns.filter(col => !(col in firstRow));
          
          if (missingColumns.length > 0) {
            setUploadError(`Missing required columns: ${missingColumns.join(', ')}`);
            return;
          }

          onDataParsed(cleanedData, file.name);
        },
        error: (error) => {
          setIsProcessing(false);
          setUploadError(`Failed to parse CSV: ${error.message}`);
        }
      });
    } catch (err) {
      setIsProcessing(false);
      setUploadError('Failed to load CSV parser. Please try again.');
      console.error('Error loading papaparse:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Card className="p-8">
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            {(isProcessing || isLoading) ? (
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-blue-600" />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {(isProcessing || isLoading) ? 'Processing CSV...' : 'Upload RFID Data'}
            </h3>
            <p className="text-slate-600 mb-4">
              Drag and drop your CSV file here, or click to browse
            </p>
          </div>

          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              disabled={isProcessing || isLoading}
            />
            <Button disabled={isProcessing || isLoading} className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Select CSV File</span>
            </Button>
          </label>

          {(uploadError || error) && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{uploadError || error}</span>
            </div>
          )}

          <div className="text-xs text-slate-500 mt-4">
            <p className="font-medium mb-1">Required columns:</p>
            <p>RFID Number, Category, Status, Condition, Location, User,</p>
            <p>QTY Washed, Washes Remaining, Assigned Location, Date Assigned, Date/Time</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Statistics Cards
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string | number; 
  icon: typeof Package;
  color: string;
}) {
  return (
    <Card className="p-4 md:p-6 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-slate-600 mb-1 truncate">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-slate-900 truncate">{value}</p>
        </div>
        <div className={`w-10 h-10 md:w-12 md:h-12 ${color} rounded-lg flex items-center justify-center flex-shrink-0 ml-3`}>
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
      </div>
    </Card>
  );
}

// Gradient KPI Card for Billing
function GradientKPICard({ 
  title, 
  value, 
  icon: Icon, 
  gradient,
  prefix = ''
}: { 
  title: string; 
  value: string | number; 
  icon: typeof Package;
  gradient: string;
  prefix?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl ${gradient} p-4 md:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
        </div>
        <p className="text-xs md:text-sm text-white/80 mb-1 font-medium truncate">{title}</p>
        <p className="text-2xl md:text-3xl font-bold text-white truncate">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
      <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16"></div>
    </div>
  );
}

// Bordered KPI Card for Stock Health
function BorderedKPICard({ 
  title, 
  value, 
  percentage,
  icon: Icon, 
  borderColor,
  iconBgColor,
  iconColor
}: { 
  title: string; 
  value: string | number; 
  percentage: number;
  icon: typeof Package;
  borderColor: string;
  iconBgColor: string;
  iconColor: string;
}) {
  return (
    <Card className={`p-4 md:p-6 border-l-4 ${borderColor} hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <div className={`w-10 h-10 md:w-12 md:h-12 ${iconBgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 md:w-6 md:h-6 ${iconColor}`} />
        </div>
        <div className="text-right flex-1 min-w-0 ml-3">
          <span className="text-xl md:text-2xl font-bold text-slate-900 truncate block">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs md:text-sm font-medium text-slate-700 truncate flex-1">{title}</p>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded whitespace-nowrap">
          {percentage}%
        </span>
      </div>
    </Card>
  );
}

// Main Dashboard Content
function RFIDDashboardContent() {
  const [csvData, setCsvData] = useState<RFIDRecord[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data from database on component mount
  const loadDatabaseData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/rfid-data');
      if (!response.ok) {
        throw new Error('Failed to load RFID data');
      }
      const result = await response.json();
      
      // Process the database data for display
      if (result.data && result.data.length > 0) {
        const csvFormatData = result.data.map((record: DatabaseRFIDRecord) => ({
          'RFID Number': record.rfid_number,
          'Category': record.category,
          'Status': record.status,
          'Condition': record.condition || '',
          'Location': record.location || '',
          'User': record.user_name || '',
          'QTY Washed': (record.qty_washed ?? 0).toString(),
          'Washes Remaining': (record.washes_remaining ?? 0).toString(),
          'Assigned Location': record.assigned_location || '',
          'Date Assigned': record.date_assigned || '',
          'Date/Time': record.date_time || '',
        }));
        setCsvData(csvFormatData);
        processData(csvFormatData, 'Database Records');
      }
    } catch (err) {
      console.error('Error loading database data:', err);
      setError('Failed to load RFID data from database');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  const handleDataParsed = async (data: RFIDRecord[], fileName: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Save to database
      const response = await fetch('/api/rfid-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rfidRecords: data }),
      });

      if (!response.ok) {
        throw new Error('Failed to save RFID data to database');
      }

      // Update local state
      setCsvData(data);
      processData(data, fileName);
      
      // Reload database data
      await loadDatabaseData();
    } catch (err) {
      console.error('Error saving RFID data:', err);
      setError('Failed to save RFID data to database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEntry = async (data: RFIDDataInsert) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Transform database format to CSV format for API
      const csvFormatRecord: RFIDRecord = {
        'RFID Number': data.rfid_number,
        'Category': data.category,
        'Status': data.status,
        'Condition': data.condition || '',
        'Location': data.location || '',
        'User': data.user_name || '',
        'QTY Washed': (data.qty_washed ?? 0).toString(),
        'Washes Remaining': (data.washes_remaining ?? 0).toString(),
        'Assigned Location': data.assigned_location || '',
        'Date Assigned': data.date_assigned ? new Date(data.date_assigned).toLocaleString() : '',
        'Date/Time': data.date_time ? new Date(data.date_time).toLocaleString() : '',
      };
      
      // Save to database as single record
      const response = await fetch('/api/rfid-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rfidRecords: [csvFormatRecord] }),
      });

      if (!response.ok) {
        throw new Error('Failed to save RFID data to database');
      }

      // Reload database data to refresh the view
      await loadDatabaseData();
    } catch (err) {
      console.error('Error saving RFID data:', err);
      setError('Failed to save RFID data to database');
      throw err; // Re-throw so the form can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const processData = (data: RFIDRecord[], fileName: string) => {
    // Count by various dimensions
    const statusCount: { [key: string]: number } = {};
    const categoryCount: { [key: string]: number } = {};
    const conditionCount: { [key: string]: number } = {};
    const locationCount: { [key: string]: number } = {};
    const assignedLocationCount: { [key: string]: number } = {};
    const uniqueRFIDs = new Set<string>();
    
    let totalWashed = 0;
    let totalWashesRemaining = 0;
    let washesRemainingCount = 0;

    data.forEach((record) => {
      // Status counts
      const status = record['Status'] || 'Unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;

      // Category counts
      const category = record['Category'] || 'Unknown';
      categoryCount[category] = (categoryCount[category] || 0) + 1;

      // Condition counts
      const condition = record['Condition'] || 'Unknown';
      conditionCount[condition] = (conditionCount[condition] || 0) + 1;

      // Location counts
      const location = record['Location'] || 'Unknown';
      locationCount[location] = (locationCount[location] || 0) + 1;

      // Assigned Location counts
      const assignedLocation = record['Assigned Location'] || 'Unknown';
      if (assignedLocation !== 'Unknown' && assignedLocation !== '') {
        assignedLocationCount[assignedLocation] = (assignedLocationCount[assignedLocation] || 0) + 1;
      }

      // Unique RFID numbers
      if (record['RFID Number']) {
        uniqueRFIDs.add(record['RFID Number']);
      }

      // Wash statistics
      const qtyWashed = parseInt(record['QTY Washed'] || '0');
      if (!isNaN(qtyWashed)) {
        totalWashed += qtyWashed;
      }

      const washesRemaining = parseInt(record['Washes Remaining'] || '0');
      if (!isNaN(washesRemaining)) {
        totalWashesRemaining += washesRemaining;
        washesRemainingCount++;
      }
    });

    // Convert to chart data format
    const byStatus = Object.entries(statusCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const byCategory = Object.entries(categoryCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const byCondition = Object.entries(conditionCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const byLocation = Object.entries(locationCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const byAssignedLocation = Object.entries(assignedLocationCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Time series data (group by date)
    const timeSeriesMap: { [key: string]: number } = {};
    data.forEach((record) => {
      const dateTime = record['Date/Time'] || record['Date Assigned'];
      if (dateTime) {
        try {
          const date = new Date(dateTime);
          if (!isNaN(date.getTime())) {
            const dateStr = date.toLocaleDateString();
            timeSeriesMap[dateStr] = (timeSeriesMap[dateStr] || 0) + 1;
          }
        } catch {
          // Skip invalid dates
        }
      }
    });
    
    const timeSeriesData = Object.entries(timeSeriesMap)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    const avgWashesRemaining = washesRemainingCount > 0 
      ? Math.round(totalWashesRemaining / washesRemainingCount) 
      : 0;

    // Billing calculations with actual category pricing
    const laundryItemsRaw = data.filter(record => {
      const status = record['Status'] || '';
      const location = record['Location'] || '';
      return status === 'Received Into Laundry' || 
             status === 'External Laundry' || 
             location === 'External Laundry';
    });

    // Filter for washed items (items that have been washed - QTY Washed > 0)
    const washedItemsRaw = data.filter(record => {
      const qtyWashed = parseInt(record['QTY Washed']?.toString() || '0');
      return qtyWashed > 0;
    });

    // Add calculated price to each item
    const laundryItems: BillingItem[] = laundryItemsRaw.map(item => ({
      ...item,
      calculatedPrice: getCategoryPrice(item['Category'] || '')
    }));

    const washedItems: BillingItem[] = washedItemsRaw.map(item => {
      const qtyWashed = parseInt(item['QTY Washed']?.toString() || '0');
      const categoryPrice = getCategoryPrice(item['Category'] || '');
      return {
        ...item,
        calculatedPrice: qtyWashed * categoryPrice
      };
    });

    const toBeReturnedCount = data.filter(record => {
      const status = record['Status'] || '';
      return status === 'Issued to Customer';
    }).length;

    const itemsAtLaundry = laundryItems.length;
    const washedItemsCount = washedItems.length;
    const billableItems = toBeReturnedCount; // Items issued to customers are the actual billable items
    const totalBilling = washedItems.reduce((sum, item) => sum + item.calculatedPrice, 0);

    // Stock Health calculations
    const condemnedItems = data.filter(record => {
      const status = record['Status'] || '';
      return status === 'Damaged' || status === 'Disposed';
    }).length;

    const needsRepair = data.filter(record => {
      const status = record['Status'] || '';
      const condition = record['Condition'] || '';
      return status === 'To be Stitched/Fix' || 
             condition === 'Teared' || 
             condition === 'Stained';
    }).length;

    const lostStolen = data.filter(record => {
      const status = record['Status'] || '';
      return status === 'Lost/Stolen';
    }).length;

    const totalLosses = condemnedItems + needsRepair + lostStolen;
    const totalItems = data.length;

    // Calculate percentages
    const condemnedPercent = totalItems > 0 ? Math.round((condemnedItems / totalItems) * 100) : 0;
    const needsRepairPercent = totalItems > 0 ? Math.round((needsRepair / totalItems) * 100) : 0;
    const lostStolenPercent = totalItems > 0 ? Math.round((lostStolen / totalItems) * 100) : 0;
    const totalLossesPercent = totalItems > 0 ? Math.round((totalLosses / totalItems) * 100) : 0;

    // Inventory calculations by category
    const categoryInventory: { [key: string]: {
      total: number;
      available: number;
      inUse: number;
      atLaundry: number;
      damagedLost: number;
    }} = {};

    data.forEach(record => {
      const category = record['Category'] || 'Unknown';
      const status = record['Status'] || '';
      
      if (!categoryInventory[category]) {
        categoryInventory[category] = {
          total: 0,
          available: 0,
          inUse: 0,
          atLaundry: 0,
          damagedLost: 0
        };
      }

      categoryInventory[category].total += 1;

      // Available
      if (status === 'Verified' || status === 'In Storage' || status === 'Procured') {
        categoryInventory[category].available += 1;
      }
      // In Use
      else if (status === 'Issued to Customer') {
        categoryInventory[category].inUse += 1;
      }
      // At Laundry
      else if (status === 'Received Into Laundry' || status === 'External Laundry') {
        categoryInventory[category].atLaundry += 1;
      }
      // Damaged/Lost
      else if (status === 'Damaged' || status === 'To be Stitched/Fix' || 
               status === 'Lost/Stolen' || status === 'Disposed') {
        categoryInventory[category].damagedLost += 1;
      }
    });

    // Convert to array and calculate availability percentages
    const categoryBreakdown = Object.entries(categoryInventory)
      .map(([category, stats]) => ({
        category,
        total: stats.total,
        available: stats.available,
        inUse: stats.inUse,
        atLaundry: stats.atLaundry,
        damagedLost: stats.damagedLost,
        availabilityPercent: stats.total > 0 
          ? Math.round((stats.available / stats.total) * 100)
          : 0
      }))
      .sort((a, b) => b.total - a.total); // Sort by total items descending

    // Calculate totals
    const totalAvailable = categoryBreakdown.reduce((sum, cat) => sum + cat.available, 0);
    const totalInUse = categoryBreakdown.reduce((sum, cat) => sum + cat.inUse, 0);
    const avgAvailability = categoryBreakdown.length > 0
      ? Math.round(categoryBreakdown.reduce((sum, cat) => sum + cat.availabilityPercent, 0) / categoryBreakdown.length)
      : 0;

    setProcessedData({
      byStatus,
      byCategory,
      byCondition,
      byLocation,
      byAssignedLocation,
      timeSeriesData,
      totalItems: data.length,
      uniqueRFIDs: uniqueRFIDs.size,
      avgWashesRemaining,
      totalWashed,
      fileName,
      billing: {
        itemsAtLaundry,
        washedItems: washedItemsCount,
        billableItems,
        totalBilling,
        toBeReturned: toBeReturnedCount,
        laundryItems,
        washedItemsList: washedItems
      },
      stockHealth: {
        condemnedItems,
        needsRepair,
        lostStolen,
        totalLosses,
        condemnedPercent,
        needsRepairPercent,
        lostStolenPercent,
        totalLossesPercent
      },
      inventory: {
        totalAvailable,
        totalInUse,
        avgAvailability,
        categoryBreakdown
      }
    });
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to clear all RFID data? This action cannot be undone.')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/rfid-data', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear RFID data');
      }

      // Reset local state
      setCsvData([]);
      setProcessedData(null);
      setError(null);
    } catch (err) {
      console.error('Error clearing RFID data:', err);
      setError('Failed to clear RFID data');
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    if (!processedData) return;

    const dataStr = JSON.stringify(processedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rfid-analysis-${new Date().toISOString()}.json`;
    link.click();
  };

  const exportBillingReport = () => {
    if (!processedData) return;
    
    // Prepare CSV data with exact columns requested
    const headers = ['RFID', 'Category', 'Status', 'Location', 'Date/Time', 'Price'];
    const rows = processedData.billing.laundryItems.map(item => [
      item['RFID Number'] || '',
      item['Category'] || '',
      item['Status'] || '',
      item['Location'] || '',
      item['Date/Time'] || '',
      formatPrice(item.calculatedPrice)
    ]);

    // Add total row at the end
    rows.push([]);
    rows.push(['TOTAL', '', '', '', '', formatPrice(processedData.billing.totalBilling)]);

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download with specific filename format
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RSL_Express_Billing_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportStockReport = () => {
    if (!processedData) return;

    // Prepare CSV data with exact columns requested
    const headers = ['Category', 'Total', 'Available', 'In Use', 'At Laundry', 'Damaged/Lost'];
    const rows = processedData.inventory.categoryBreakdown.map(cat => [
      cat.category,
      cat.total.toString(),
      cat.available.toString(),
      cat.inUse.toString(),
      cat.atLaundry.toString(),
      cat.damagedLost.toString()
    ]);

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download with specific filename format
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stock_Inventory_Report_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
                <Radio className="w-8 h-8 text-blue-600" />
                <span>RFID Laundry Tracking</span>
              </h1>
              <p className="text-slate-600 mt-2">
                Upload and analyze RFID tag data from your laundry operations
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <ManualEntryForm onSave={handleManualEntry} isLoading={isLoading} />
              {processedData && (
                <Button
                  onClick={exportData}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Analysis</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* CSV Upload Section */}
        {!csvData.length && (
          <div className="animate-fadeIn">
            <CSVUploadZone 
              onDataParsed={handleDataParsed} 
              isLoading={isLoading}
              error={error}
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card className="p-8">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-600">Processing data...</span>
            </div>
          </Card>
        )}

        {/* Data Visualization */}
        {processedData && (
          <div className="space-y-8 animate-fadeIn">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <StatCard
                title="Total Records"
                value={processedData.totalItems.toLocaleString()}
                icon={FileSpreadsheet}
                color="bg-blue-500"
              />
              <StatCard
                title="Unique RFID Tags"
                value={processedData.uniqueRFIDs.toLocaleString()}
                icon={Radio}
                color="bg-green-500"
              />
              <StatCard
                title="Total Washes"
                value={processedData.totalWashed.toLocaleString()}
                icon={TrendingUp}
                color="bg-purple-500"
              />
              <StatCard
                title="Avg Washes Left"
                value={processedData.avgWashesRemaining}
                icon={BarChart3}
                color="bg-orange-500"
              />
            </div>

            {/* File Info and Action Buttons */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {processedData.fileName}
                    </p>
                    <p className="text-xs text-slate-600">
                      {processedData.totalItems} records • {processedData.uniqueRFIDs} unique RFID tags
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => {
                      setCsvData([]);
                      setProcessedData(null);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload New File</span>
                  </Button>
                  <Button
                    onClick={clearAllData}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:border-red-300"
                    disabled={isLoading}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Clear All Data</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Charts Grid - Lazy Loaded */}
            {processedData && (
              <RFIDCharts processedData={processedData} colors={COLORS} />
            )}

            {/* RSL Express Billing Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
                    <CreditCard className="w-7 h-7 text-blue-600" />
                    <span>RSL Express Billing</span>
                  </h2>
                  <p className="text-slate-600 mt-1">
                    Laundry items billing with RSL Express category pricing
                  </p>
                </div>
                <Button
                  onClick={exportBillingReport}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Billing Report</span>
                </Button>
              </div>

              {/* Gradient KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                <GradientKPICard
                  title="Items at Laundry"
                  value={processedData.billing.itemsAtLaundry}
                  icon={ShoppingBag}
                  gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <GradientKPICard
                  title="Washed Items"
                  value={processedData.billing.washedItems}
                  icon={CheckCircle}
                  gradient="bg-gradient-to-br from-cyan-500 to-cyan-600"
                />
                <GradientKPICard
                  title="Billable Items"
                  value={processedData.billing.billableItems}
                  icon={Package}
                  gradient="bg-gradient-to-br from-green-500 to-green-600"
                />
                <GradientKPICard
                  title="Total Billing"
                  value={processedData.billing.totalBilling}
                  icon={DollarSign}
                  gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                  prefix="R"
                />
              </div>

              {/* Billing Items Table */}
              <Card className="p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-3 md:mb-4">
                  Washed Items (Ready for Billing)
                </h3>
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              RFID Number
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              Category
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              Status
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              Washes
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              Location
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              Date/Time
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              Price
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {processedData.billing.washedItemsList.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-slate-900 whitespace-nowrap">
                                {item['RFID Number']}
                              </td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-slate-700 whitespace-nowrap">
                                {item['Category']}
                              </td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-slate-700">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                  {item['Status']}
                                </span>
                              </td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-center font-medium text-slate-900 whitespace-nowrap">
                                {item['QTY Washed']}
                              </td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-slate-700 whitespace-nowrap">
                                {item['Location']}
                              </td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-slate-700 whitespace-nowrap">
                                {item['Date/Time']}
                              </td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-right font-medium text-slate-900 whitespace-nowrap">
                                {formatPrice(item.calculatedPrice)}
                              </td>
                            </tr>
                          ))}
                          {/* Total Row */}
                          <tr className="bg-slate-100 font-semibold">
                            <td className="px-3 md:px-4 py-3 md:py-4 text-xs md:text-sm text-slate-900" colSpan={6}>
                              <div className="flex flex-col md:flex-row justify-between md:items-center gap-1">
                                <span className="text-sm md:text-base font-bold">TOTAL</span>
                                <span className="text-xs md:text-sm text-slate-600">
                                  {processedData.billing.washedItems} items (variable pricing)
                                </span>
                              </div>
                            </td>
                            <td className="px-3 md:px-4 py-3 md:py-4 text-right text-sm md:text-base text-slate-900 whitespace-nowrap font-bold">
                              {formatPrice(processedData.billing.totalBilling)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                {processedData.billing.washedItemsList.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No washed items ready for billing</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Stock Health & Losses Section */}
            <div className="mt-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
                  <Shield className="w-7 h-7 text-blue-600" />
                  <span>Stock Health & Losses</span>
                </h2>
                <p className="text-slate-600 mt-1">
                  Track item condition, damages, and losses
                </p>
              </div>

              {/* Bordered KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                <BorderedKPICard
                  title="Condemned Items"
                  value={processedData.stockHealth.condemnedItems}
                  percentage={processedData.stockHealth.condemnedPercent}
                  icon={XCircle}
                  borderColor="border-red-500"
                  iconBgColor="bg-red-50"
                  iconColor="text-red-600"
                />
                <BorderedKPICard
                  title="Needs Repair"
                  value={processedData.stockHealth.needsRepair}
                  percentage={processedData.stockHealth.needsRepairPercent}
                  icon={Wrench}
                  borderColor="border-orange-500"
                  iconBgColor="bg-orange-50"
                  iconColor="text-orange-600"
                />
                <BorderedKPICard
                  title="Lost/Stolen"
                  value={processedData.stockHealth.lostStolen}
                  percentage={processedData.stockHealth.lostStolenPercent}
                  icon={AlertTriangle}
                  borderColor="border-purple-500"
                  iconBgColor="bg-purple-50"
                  iconColor="text-purple-600"
                />
                <BorderedKPICard
                  title="Total Losses"
                  value={processedData.stockHealth.totalLosses}
                  percentage={processedData.stockHealth.totalLossesPercent}
                  icon={AlertCircle}
                  borderColor="border-slate-500"
                  iconBgColor="bg-slate-50"
                  iconColor="text-slate-600"
                />
              </div>

              {/* Condition Breakdown Pie Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Condition Breakdown
                </h3>
                <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                  <ResponsiveContainer width="100%" height={350} className="lg:w-1/2">
                    <PieChart>
                      <Pie
                        data={processedData.byCondition}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                      >
                        {processedData.byCondition.map((entry, index) => {
                          // Custom colors for conditions
                          const conditionColors: { [key: string]: string } = {
                            'Good': '#2E7D32',
                            'Average': '#F57C00',
                            'Bad': '#D32F2F',
                            'Teared': '#7B1FA2',
                            'Stained': '#C2185B'
                          };
                          const color = conditionColors[entry.name] || COLORS[index % COLORS.length];
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Condition Legend with Counts */}
                  <div className="lg:w-1/2 space-y-3">
                    {processedData.byCondition.map((item, index) => {
                      const conditionColors: { [key: string]: string } = {
                        'Good': '#2E7D32',
                        'Average': '#F57C00',
                        'Bad': '#D32F2F',
                        'Teared': '#7B1FA2',
                        'Stained': '#C2185B'
                      };
                      const color = conditionColors[item.name] || COLORS[index % COLORS.length];
                      const percentage = processedData.totalItems > 0 
                        ? Math.round((item.value / processedData.totalItems) * 100) 
                        : 0;
                      
                      return (
                        <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: color }}
                            ></div>
                            <span className="font-medium text-slate-900">{item.name}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-bold text-slate-900">{item.value}</span>
                            <span className="text-sm text-slate-500 bg-white px-2 py-1 rounded">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>

            {/* Client Inventory Status Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
                    <ClipboardList className="w-7 h-7 text-blue-600" />
                    <span>Client Inventory Status</span>
                  </h2>
                  <p className="text-slate-600 mt-1">
                    Category-wise stock availability and usage tracking
                  </p>
                </div>
                <Button
                  onClick={exportStockReport}
                  className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Stock Report</span>
                </Button>
              </div>

              {/* Summary KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-600 font-medium mb-1">Available Now</p>
                      <p className="text-3xl font-bold text-green-900">
                        {processedData.inventory.totalAvailable}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-green-700">Ready for immediate use</p>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-600 font-medium mb-1">Currently In Use</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {processedData.inventory.totalInUse}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700">Issued to customers</p>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-purple-600 font-medium mb-1">Stock Level</p>
                      <p className="text-3xl font-bold text-purple-900">
                        {processedData.inventory.avgAvailability}%
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-purple-700">Average availability</p>
                </Card>
              </div>

              {/* Detailed Category Breakdown Table */}
              <Card className="p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-3 md:mb-4">
                  Category Breakdown
                </h3>
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              Category
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              Total
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              Available
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              In Use
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              At Laundry
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              Damaged/Lost
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              Availability
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {processedData.inventory.categoryBreakdown.map((category, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 md:px-4 py-3 md:py-4 text-xs md:text-sm font-medium text-slate-900 whitespace-nowrap">
                                {category.category}
                              </td>
                              <td className="px-3 md:px-4 py-3 md:py-4 text-center text-xs md:text-sm font-semibold text-slate-900">
                                {category.total}
                              </td>
                              <td className="px-3 md:px-4 py-3 md:py-4 text-center text-xs md:text-sm font-semibold text-green-600">
                                {category.available}
                              </td>
                              <td className="px-3 md:px-4 py-3 md:py-4 text-center text-xs md:text-sm font-semibold text-blue-600">
                                {category.inUse}
                              </td>
                              <td className="px-3 md:px-4 py-3 md:py-4 text-center text-xs md:text-sm font-semibold text-purple-600">
                                {category.atLaundry}
                              </td>
                              <td className="px-3 md:px-4 py-3 md:py-4 text-center text-xs md:text-sm font-semibold text-red-600">
                                {category.damagedLost}
                              </td>
                              <td className="px-3 md:px-4 py-3 md:py-4">
                                <div className="flex items-center space-x-2 md:space-x-3">
                                  <div className="flex-1 min-w-[80px] md:min-w-[120px]">
                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all ${
                                          category.availabilityPercent >= 70 
                                            ? 'bg-green-500' 
                                            : category.availabilityPercent >= 40 
                                            ? 'bg-yellow-500' 
                                            : 'bg-red-500'
                                        }`}
                                        style={{ width: `${category.availabilityPercent}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <span className={`text-xs md:text-sm font-semibold min-w-[2.5rem] md:min-w-[3rem] text-right whitespace-nowrap ${
                                    category.availabilityPercent >= 70 
                                      ? 'text-green-600' 
                                      : category.availabilityPercent >= 40 
                                      ? 'text-yellow-600' 
                                      : 'text-red-600'
                                  }`}>
                                    {category.availabilityPercent}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                {processedData.inventory.categoryBreakdown.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm md:text-base">No inventory data available</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Raw Data Table Preview */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Data Preview (First 10 Records)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      {csvData.length > 0 && Object.keys(csvData[0]).map((key) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {csvData.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((value, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-3 text-sm text-slate-700">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 10 && (
                <p className="text-sm text-slate-500 mt-4">
                  Showing 10 of {csvData.length} records
                </p>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RFIDDashboardPage() {
  return (
    <AuthGuard>
      <RFIDDashboardContent />
    </AuthGuard>
  );
}

