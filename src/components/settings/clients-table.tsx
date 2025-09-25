'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Search,
  Plus,
  Edit,
  Eye,
  Users,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import type { Client } from '@/types/database';

interface ClientsTableProps {
  onAddClient: () => void;
  onEditClient: (client: Client) => void;
  onViewClient: (client: Client) => void;
}

export default function ClientsTable({ onAddClient, onEditClient, onViewClient }: ClientsTableProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load clients
  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/clients');
      const result = await response.json();

      if (result.success) {
        const data = result.data;
        const normalized = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.clients) ? data.clients : []);
        setClients(normalized);
      } else {
        setError(result.error || 'Failed to load clients');
      }
    } catch {
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.contact_number && client.contact_number.includes(searchTerm))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
            <LoadingSkeleton width="w-32" height="h-10" />
          </div>
        </CardHeader>
        <CardContent>
          <LoadingTable rows={5} columns={6} />
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
              <Users className="w-5 h-5 text-blue-600" />
              <span>Clients</span>
            </CardTitle>
            <CardDescription>
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
              {searchTerm && ` matching "${searchTerm}"`}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadClients}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={onAddClient} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Client</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center space-x-1">
              <XCircle className="w-4 h-4" />
              <span>{error}</span>
            </p>
          </div>
        )}

        {filteredClients.length === 0 ? (
          searchTerm ? (
            <EmptyState
              icon={<Search className="w-full h-full" />}
              title="No clients found"
              description={`No clients match "${searchTerm}". Try a different search term.`}
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
              icon={<Users className="w-full h-full" />}
              title="No clients yet"
              description="Get started by adding your first client to the system."
              action={{
                label: 'Add First Client',
                onClick: onAddClient
              }}
              suggestions={[
                'Add client contact information',
                'Set up client billing details',
                'Configure client preferences'
              ]}
              className="py-8"
            />
          )
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">
                      {client.name}
                    </TableCell>
                    <TableCell>
                      {client.contact_number ? (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span className="text-sm">{client.contact_number}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">No phone</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.email ? (
                        <div className="flex items-center space-x-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span className="text-sm">{client.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">No email</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.address ? (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span className="text-sm truncate max-w-32">{client.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">No address</span>
                      )}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(client.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewClient(client)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditClient(client)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
