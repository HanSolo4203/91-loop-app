'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Users, 
  Search, 
  Plus,
  Check,
  X,
  ChevronDown
} from 'lucide-react';
import type { Client } from '@/types/database';

interface ClientInfoFormProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client | null) => void;
  onClientCreate: (clientData: Partial<Client>) => void;
  isLoading?: boolean;
  error?: string;
}


export default function ClientInfoForm({
  selectedClient,
  onClientSelect,
  onClientCreate,
  isLoading = false,
  error
}: ClientInfoFormProps) {
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    contact_number: '',
    email: '',
    address: '',
  });
  const [clientsError, setClientsError] = useState('');

  // Load all clients
  const loadAllClients = async () => {
    setIsLoadingClients(true);
    setClientsError('');

    try {
      const response = await fetch('/api/clients?page_size=100');
      const result = await response.json();

      if (result.success) {
        setAllClients(result.data?.clients || []);
      } else {
        setClientsError(result.error || 'Failed to load clients');
        setAllClients([]);
      }
    } catch (error) {
      setClientsError('Failed to load clients');
      setAllClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Load clients on component mount
  useEffect(() => {
    loadAllClients();
  }, []);

  // Handle client selection from dropdown
  const handleClientSelect = (clientId: string) => {
    const client = allClients.find(c => c.id === clientId);
    if (client) {
      onClientSelect(client);
    }
  };

  // Handle creating new client
  const handleCreateNewClient = async () => {
    if (!newClientData.name.trim()) {
      setClientsError('Client name is required');
      return;
    }

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newClientData.name.trim(),
          contact_number: newClientData.contact_number.trim() || undefined,
          email: newClientData.email.trim() || undefined,
          address: newClientData.address.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const newClient = result.data;
        onClientSelect(newClient);
        setIsCreatingNew(false);
        setNewClientData({ name: '', contact_number: '', email: '', address: '' });
        // Reload clients to include the new one
        loadAllClients();
      } else {
        setClientsError(result.error || 'Failed to create client');
      }
    } catch (error) {
      setClientsError('Failed to create client');
    }
  };

  // Clear selected client
  const handleClearClient = () => {
    onClientSelect(null);
    setClientsError('');
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="w-5 h-5 text-blue-600" />
          <span>Client Information</span>
        </CardTitle>
        <CardDescription>
          Select an existing client or create a new one for this batch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client Dropdown Selector */}
        <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <label htmlFor="client-select" className="text-base font-semibold text-slate-900 flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Select Client</span>
          </label>
          <div className="space-y-2">
            <Select
              value={selectedClient?.id || ""}
              onValueChange={handleClientSelect}
              disabled={isLoading || isLoadingClients}
            >
              <SelectTrigger className="w-full !border-2 !border-slate-300 !bg-white !shadow-md hover:!border-blue-400 focus:!border-blue-500 focus:!ring-2 focus:!ring-blue-200 !text-slate-900 !font-medium !h-12 !text-base transition-all duration-200 hover:!shadow-lg [&>svg]:animate-pulse">
                <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Choose a client..."} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] !border-2 !border-slate-300 !shadow-xl !bg-white !backdrop-blur-sm !z-50">
                {allClients.map((client) => (
                  <SelectItem key={client.id} value={client.id} className="!py-3 !px-3 hover:!bg-blue-50 focus:!bg-blue-100 !cursor-pointer">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{client.name}</span>
                          {!client.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                          {client.contact_number && (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{client.contact_number}</span>
                            </span>
                          )}
                          {client.email && (
                            <span className="flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span>{client.email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
                {allClients.length === 0 && !isLoadingClients && (
                  <div className="p-3 text-center text-slate-500">
                    No clients found.
                  </div>
                )}
              </SelectContent>
            </Select>
            
            {/* Create New Client Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsCreatingNew(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4" />
                <span>Create New Client</span>
              </button>
              
              {selectedClient && (
                <button
                  onClick={handleClearClient}
                  className="text-sm text-slate-500 hover:text-slate-700 flex items-center space-x-1"
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Clients Error */}
          {clientsError && (
            <p className="text-sm text-red-600 flex items-center space-x-1">
              <X className="w-3 h-3" />
              <span>{clientsError}</span>
            </p>
          )}
        </div>

        {/* Create New Client Form */}
        {isCreatingNew && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-900">Create New Client</h4>
              <button
                onClick={() => setIsCreatingNew(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="new-client-name" className="text-sm font-medium text-slate-700">
                  Client Name *
                </label>
                <Input
                  id="new-client-name"
                  type="text"
                  placeholder="Enter client name"
                  value={newClientData.name}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="new-client-phone" className="text-sm font-medium text-slate-700">
                  Contact Number
                </label>
                <Input
                  id="new-client-phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={newClientData.contact_number}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, contact_number: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="new-client-email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <Input
                  id="new-client-email"
                  type="email"
                  placeholder="Enter email address"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="new-client-address" className="text-sm font-medium text-slate-700">
                  Address
                </label>
                <Input
                  id="new-client-address"
                  type="text"
                  placeholder="Enter address"
                  value={newClientData.address}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={handleCreateNewClient}
                disabled={!newClientData.name.trim()}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Client</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCreatingNew(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Selected Client Display */}
        {selectedClient && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Selected Client</span>
              </div>
              <button
                onClick={handleClearClient}
                className="text-blue-600 hover:text-blue-700"
                disabled={isLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-slate-900">{selectedClient.name}</span>
                {!selectedClient.is_active && (
                  <Badge variant="secondary" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
              
              {selectedClient.contact_number && (
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span>{selectedClient.contact_number}</span>
                </div>
              )}
              
              {selectedClient.email && (
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Mail className="w-4 h-4" />
                  <span>{selectedClient.email}</span>
                </div>
              )}
              
              {selectedClient.address && (
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedClient.address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center space-x-1">
              <X className="w-4 h-4" />
              <span>{error}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
