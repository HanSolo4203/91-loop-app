'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  Activity
} from 'lucide-react';
import type { Client } from '@/types/database';

interface ClientDetailsProps {
  client: Client;
  onEdit: () => void;
  onBack: () => void;
}

export default function ClientDetails({ client, onEdit, onBack }: ClientDetailsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clients</span>
        </Button>
        <Button onClick={onEdit} className="flex items-center space-x-2">
          <Edit className="w-4 h-4" />
          <span>Edit Client</span>
        </Button>
      </div>

      {/* Client Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-600" />
                <span>{client.name}</span>
              </CardTitle>
              <CardDescription>
                Client information and contact details
              </CardDescription>
            </div>
            <Badge 
              className={
                client.is_active 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-red-100 text-red-800 border-red-200'
              }
            >
              {client.is_active ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Inactive
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Number */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                <Phone className="w-4 h-4" />
                <span>Contact Number</span>
              </div>
              <div className="pl-6">
                {client.contact_number ? (
                  <p className="text-slate-900">{client.contact_number}</p>
                ) : (
                  <p className="text-slate-400 italic">No contact number provided</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                <Mail className="w-4 h-4" />
                <span>Email Address</span>
              </div>
              <div className="pl-6">
                {client.email ? (
                  <a 
                    href={`mailto:${client.email}`}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {client.email}
                  </a>
                ) : (
                  <p className="text-slate-400 italic">No email address provided</p>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm font-medium text-slate-700">
              <MapPin className="w-4 h-4" />
              <span>Address</span>
            </div>
            <div className="pl-6">
              {client.address ? (
                <p className="text-slate-900 whitespace-pre-wrap">{client.address}</p>
              ) : (
                <p className="text-slate-400 italic">No address provided</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span>Client Statistics</span>
          </CardTitle>
          <CardDescription>
            Overview of client activity and batch history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Batches */}
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">0</div>
              <div className="text-sm text-slate-600">Total Batches</div>
            </div>

            {/* Active Batches */}
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-slate-600">Active Batches</div>
            </div>

            {/* Total Revenue */}
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">R0.00</div>
              <div className="text-sm text-slate-600">Total Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Timeline Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Client Timeline</span>
          </CardTitle>
          <CardDescription>
            Important dates and milestones for this client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Created Date */}
            <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-slate-900">Client Created</p>
                <p className="text-xs text-slate-500">{formatDate(client.created_at)}</p>
              </div>
            </div>

            {/* Last Updated */}
            {client.updated_at && client.updated_at !== client.created_at && (
              <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-lg">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Last Updated</p>
                  <p className="text-xs text-slate-500">{formatDate(client.updated_at)}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
