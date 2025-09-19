'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Package, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface StatusUpdaterProps {
  currentStatus: 'pickup' | 'washing' | 'completed' | 'delivered';
  onStatusUpdate: (newStatus: string, notes?: string) => Promise<void>;
  loading?: boolean;
}

const statusFlow = {
  pickup: {
    next: 'washing',
    label: 'Start Washing',
    description: 'Move batch to washing status',
    icon: RefreshCw,
    color: 'bg-yellow-600 hover:bg-yellow-700'
  },
  washing: {
    next: null, // Multiple options available
    label: null,
    description: null,
    icon: null,
    color: null,
    options: [
      {
        status: 'completed',
        label: 'Mark Completed',
        description: 'Complete washing and mark as finished',
        icon: CheckCircle,
        color: 'bg-green-600 hover:bg-green-700'
      },
      {
        status: 'delivered',
        label: 'Mark Delivered',
        description: 'Complete washing and mark as delivered',
        icon: Package,
        color: 'bg-blue-600 hover:bg-blue-700'
      }
    ]
  },
  completed: {
    next: 'delivered',
    label: 'Mark Delivered',
    description: 'Mark batch as delivered',
    icon: Package,
    color: 'bg-blue-600 hover:bg-blue-700'
  },
  delivered: {
    next: null,
    label: null,
    description: null,
    icon: null,
    color: null
  }
};

const statusConfig = {
  pickup: {
    label: 'Pickup',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Package
  },
  washing: {
    label: 'Washing',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: RefreshCw
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Package
  }
};

export default function StatusUpdater({ currentStatus, onStatusUpdate, loading = false }: StatusUpdaterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const currentStatusInfo = statusConfig[currentStatus];
  const CurrentStatusIcon = currentStatusInfo.icon;
  
  const nextStatusInfo = statusFlow[currentStatus];
  const NextStatusIcon = nextStatusInfo.icon;

  const handleStatusUpdate = async (targetStatus?: string) => {
    const statusToUpdate = targetStatus || selectedStatus;
    if (!statusToUpdate) return;

    setIsUpdating(true);
    setError('');

    try {
      await onStatusUpdate(statusToUpdate, notes.trim() || undefined);
      setIsDialogOpen(false);
      setNotes('');
      setSelectedStatus('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDirectStatusUpdate = async (status: string) => {
    setIsDialogOpen(true);
    setSelectedStatus(status);
    setError('');
  };

  const canUpdateStatus = (nextStatusInfo.next !== null || ((nextStatusInfo as any).options && (nextStatusInfo as any).options.length > 0)) && !loading;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-slate-200 rounded w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 w-24 bg-slate-200 rounded"></div>
            <div className="h-10 w-32 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <span>Status Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <CurrentStatusIcon className="w-5 h-5 text-black" />
            <div>
              <p className="text-sm text-black">Current Status</p>
              <Badge className={currentStatusInfo.className}>
                {currentStatusInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Next Status Action */}
        {canUpdateStatus && (
          <div className="space-y-3">
            {currentStatus === 'washing' ? (
              // Multiple status options for processing
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-black">
                  <ArrowRight className="w-4 h-4" />
                  <span>Choose next status:</span>
                </div>
                <div className="space-y-2">
                  {(nextStatusInfo as any).options?.map((option: any) => {
                    const OptionIcon = option.icon;
                    return (
                      <Button
                        key={option.status}
                        variant="outline"
                        className={`w-full justify-start ${option.color.replace('hover:', '')} text-black border-0`}
                        onClick={() => handleDirectStatusUpdate(option.status)}
                        disabled={loading}
                      >
                        {OptionIcon && <OptionIcon className="w-4 h-4 mr-2" />}
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Single status option for other statuses
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-black">
                  <ArrowRight className="w-4 h-4" />
                  <span>Next: {statusConfig[nextStatusInfo.next! as keyof typeof statusConfig].label}</span>
                </div>

                <Button 
                  className={`w-full ${nextStatusInfo.color} text-black`}
                  onClick={() => handleDirectStatusUpdate(nextStatusInfo.next!)}
                  disabled={loading}
                >
                  {NextStatusIcon && <NextStatusIcon className="w-4 h-4 mr-2" />}
                  {nextStatusInfo.label}
                </Button>
              </div>
            )}

            {/* Status Update Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <style jsx global>{`
                [data-radix-dialog-overlay] {
                  background-color: transparent !important;
                }
              `}</style>
              <DialogContent 
                className="sm:max-w-md !shadow-2xl !border-2 !border-slate-300 !bg-white !backdrop-blur-sm" 
                style={{ 
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.1)',
                  border: '2px solid #cbd5e1',
                  backgroundColor: 'rgba(255, 255, 255, 0.98)'
                }}
              >
                <DialogHeader>
                  <DialogTitle>Update Batch Status</DialogTitle>
                  <DialogDescription>
                    {selectedStatus 
                      ? (currentStatus === 'washing' 
                          ? (nextStatusInfo as any).options?.find((opt: any) => opt.status === selectedStatus)?.description
                          : nextStatusInfo.description)
                      : 'Confirm the status update'
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    <Badge className={currentStatusInfo.className}>
                      {currentStatusInfo.label}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <Badge className={statusConfig[selectedStatus as keyof typeof statusConfig]?.className || 'bg-gray-100 text-gray-800'}>
                      {statusConfig[selectedStatus as keyof typeof statusConfig]?.label || selectedStatus}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="status-notes" className="text-sm font-medium text-black">
                      Notes (Optional)
                    </label>
                    <Textarea
                      id="status-notes"
                      placeholder="Add any notes about this status change..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setNotes('');
                      setSelectedStatus('');
                      setError('');
                    }}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate()}
                    disabled={isUpdating}
                    className={selectedStatus 
                      ? (currentStatus === 'washing' 
                          ? (nextStatusInfo as any).options?.find((opt: any) => opt.status === selectedStatus)?.color
                          : nextStatusInfo.color)
                      : 'bg-blue-600 hover:bg-blue-700'
                    }
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Update
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Status is final */}
        {!canUpdateStatus && (
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <div className="flex items-center justify-center space-x-2 text-black">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">
                {currentStatus === 'completed' 
                  ? 'Batch completed successfully' 
                  : 'Batch status cannot be updated'
                }
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
