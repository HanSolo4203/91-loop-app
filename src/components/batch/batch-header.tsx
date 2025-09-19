'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  FileText,
  Clock,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

interface BatchHeaderProps {
  batch: {
    id: string;
    paper_batch_id: string;
    status: 'pickup' | 'washing' | 'completed' | 'delivered';
    pickup_date: string;
    delivery_date?: string;
    created_at: string;
    updated_at: string;
    notes?: string;
  };
  client: {
    id: string;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    billing_address?: string;
  };
  loading?: boolean;
}

const statusConfig = {
  pickup: {
    label: 'Pickup',
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Package
  },
  washing: {
    label: 'Washing',
    variant: 'secondary' as const,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: RefreshCw
  },
  completed: {
    label: 'Completed',
    variant: 'secondary' as const,
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle
  },
  delivered: {
    label: 'Delivered',
    variant: 'secondary' as const,
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Package
  }
};

export default function BatchHeader({ batch, client, loading = false }: BatchHeaderProps) {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 bg-slate-200 rounded w-48"></div>
              <div className="h-4 bg-slate-200 rounded w-64"></div>
            </div>
            <div className="h-6 w-20 bg-slate-200 rounded"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-4 bg-slate-200 rounded w-32"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-slate-200 rounded w-32"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = statusConfig[batch.status];
  const StatusIcon = statusInfo.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">
                Batch {batch.paper_batch_id}
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                System ID: #{batch.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <Badge className={statusInfo.className}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Batch Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900 flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Batch Information</span>
            </h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Pickup Date</p>
                  <p className="font-medium">{formatDate(batch.pickup_date)}</p>
                </div>
              </div>
              
              {batch.delivery_date && (
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600">Delivery Date</p>
                    <p className="font-medium">{formatDate(batch.delivery_date)}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Last Updated</p>
                  <p className="font-medium">{formatDateTime(batch.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900 flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Client Information</span>
            </h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Client Name</p>
                  <p className="font-medium">{client.name}</p>
                </div>
              </div>
              
              {client.contact_person && (
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600">Contact Person</p>
                    <p className="font-medium">{client.contact_person}</p>
                  </div>
                </div>
              )}
              
              {client.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
              )}
              
              {client.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                </div>
              )}
              
              {client.address && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600">Address</p>
                    <p className="font-medium">{client.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes Section */}
        {batch.notes && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="font-medium text-slate-900 flex items-center space-x-2 mb-3">
              <FileText className="w-4 h-4" />
              <span>Notes</span>
            </h4>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{batch.notes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
