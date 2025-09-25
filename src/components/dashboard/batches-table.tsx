'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSkeleton, LoadingTable } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface Batch {
  id: string;
  paper_batch_id: string;
  client: {
    name: string;
  };
  pickup_date: string;
  status: 'pickup' | 'washing' | 'completed' | 'delivered';
  total_amount: number;
  created_at: string;
}

interface BatchesTableProps {
  batches: Batch[];
  loading?: boolean;
  onBatchClick?: (batch: Batch) => void;
  selectedMonth?: {
    month: number;
    year: number;
  };
}

const statusConfig = {
  pickup: {
    label: 'Pickup',
    variant: 'secondary' as const,
    icon: Package,
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  washing: {
    label: 'Washing',
    variant: 'secondary' as const,
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  completed: {
    label: 'Completed',
    variant: 'secondary' as const,
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  delivered: {
    label: 'Delivered',
    variant: 'secondary' as const,
    icon: Package,
    className: 'bg-purple-100 text-purple-800 border-purple-200'
  }
};

const ITEMS_PER_PAGE = 10;

export default function BatchesTable({ batches, loading = false, onBatchClick, selectedMonth }: BatchesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('washing,completed,delivered');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and search batches
  const filteredBatches = useMemo(() => {
    let filtered = batches;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'washing,completed,delivered') {
        filtered = filtered.filter(batch => 
          ['washing', 'completed', 'delivered'].includes(batch.status)
        );
      } else {
        filtered = filtered.filter(batch => batch.status === statusFilter);
      }
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(batch =>
        batch.paper_batch_id.toLowerCase().includes(term) ||
        batch.client.name.toLowerCase().includes(term) ||
        batch.status.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [batches, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredBatches.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedBatches = filteredBatches.slice(startIndex, endIndex);

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Reset to first page when status filter changes
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const getStatusBadge = (status: Batch['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <LoadingSkeleton width="w-48" height="h-6" />
              <LoadingSkeleton width="w-64" height="h-4" />
            </div>
            <LoadingSkeleton width="w-64" height="h-10" />
          </div>
        </CardHeader>
        <CardContent>
          <LoadingTable rows={5} columns={7} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span>Recent Batches</span>
            </CardTitle>
            <CardDescription>
              {filteredBatches.length} batch{filteredBatches.length !== 1 ? 'es' : ''} found
              {selectedMonth && ` for ${new Date(selectedMonth.year, selectedMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
              {statusFilter !== 'all' && (
                <span className="text-blue-600">
                  {statusFilter === 'washing,completed,delivered' 
                    ? ' (Washing + Completed + Delivered)' 
                    : ` (${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)})`}
                </span>
              )}
              {searchTerm && ` matching "${searchTerm}"`}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="washing">Washing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="washing,completed,delivered">Washing + Completed + Delivered</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search batches..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredBatches.length === 0 ? (
          searchTerm ? (
            <EmptyState
              icon={<Search className="w-full h-full" />}
              title="No batches found"
              description={`No batches match "${searchTerm}". Try a different search term.`}
              action={{
                label: 'Clear Search',
                onClick: () => setSearchTerm(''),
                variant: 'outline'
              }}
              suggestions={[
                'Try different keywords',
                'Check your spelling',
                'Use broader search terms'
              ]}
              className="py-8"
            />
          ) : (
            <EmptyState
              icon={<Package className="w-full h-full" />}
              title="No batches yet"
              description="Get started by creating your first batch to track linen items."
              action={{
                label: 'Create First Batch',
                onClick: () => window.location.href = '/batch/new'
              }}
              suggestions={[
                'Create a new batch to start tracking',
                'Import existing data from your system',
                'Set up clients and categories first'
              ]}
              className="py-8"
            />
          )
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paper Batch ID</TableHead>
                    <TableHead>System ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBatches.map((batch) => (
                    <TableRow 
                      key={batch.id} 
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => onBatchClick?.(batch)}
                    >
                      <TableCell className="font-medium">
                        {batch.paper_batch_id}
                      </TableCell>
                      <TableCell className="text-slate-500 font-mono text-sm">
                        #{batch.id.slice(-8)}
                      </TableCell>
                      <TableCell>{batch.client.name}</TableCell>
                      <TableCell>{formatDate(batch.pickup_date)}</TableCell>
                      <TableCell>
                        {getStatusBadge(batch.status)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(batch.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/batch/${batch.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-slate-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredBatches.length)} of {filteredBatches.length} batches
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
