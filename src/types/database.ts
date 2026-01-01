// Database types for Supabase Linen Tracking System
// These types match the database schema created in the migration files

export interface Database {
  public: {
    Tables: {
      // Profiles table for user authentication
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: 'admin' | 'user';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: 'admin' | 'user';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: 'admin' | 'user';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // Linen Categories table
      linen_categories: {
        Row: {
          id: string;
          name: string;
          price_per_item: number;
          is_active: boolean;
          section: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price_per_item?: number;
          is_active?: boolean;
          section?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price_per_item?: number;
          is_active?: boolean;
          section?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // Clients table
      clients: {
        Row: {
          id: string;
          name: string;
          contact_number: string | null;
          email: string | null;
          address: string | null;
          is_active: boolean;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          is_active?: boolean;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          is_active?: boolean;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // Client Favorite Categories table
      client_favorite_categories: {
        Row: {
          id: string;
          client_id: string;
          linen_category_id: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          linen_category_id: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          linen_category_id?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_favorite_categories_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_favorite_categories_linen_category_id_fkey";
            columns: ["linen_category_id"];
            referencedRelation: "linen_categories";
            referencedColumns: ["id"];
          }
        ];
      };

      // Business Settings table
      business_settings: {
        Row: {
          id: string;
          company_name: string | null;
          logo_url: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          bank_name: string | null;
          bank_account_name: string | null;
          bank_account_number: string | null;
          bank_branch_code: string | null;
          bank_account_type: string | null;
          bank_payment_reference: string | null;
          payment_terms_days: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name?: string | null;
          logo_url?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          bank_name?: string | null;
          bank_account_name?: string | null;
          bank_account_number?: string | null;
          bank_branch_code?: string | null;
          bank_account_type?: string | null;
          bank_payment_reference?: string | null;
          payment_terms_days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string | null;
          logo_url?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          bank_name?: string | null;
          bank_account_name?: string | null;
          bank_account_number?: string | null;
          bank_branch_code?: string | null;
          bank_account_type?: string | null;
          bank_payment_reference?: string | null;
          payment_terms_days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // Batches table
      batches: {
        Row: {
          id: string;
          paper_batch_id: string;
          system_batch_id: string;
          client_id: string;
          pickup_date: string;
          status: Database['public']['Enums']['batch_status'];
          total_amount: number;
          has_discrepancy: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          paper_batch_id: string;
          system_batch_id?: string;
          client_id: string;
          pickup_date: string;
          status?: Database['public']['Enums']['batch_status'];
          total_amount?: number;
          has_discrepancy?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          paper_batch_id?: string;
          system_batch_id?: string;
          client_id?: string;
          pickup_date?: string;
          status?: Database['public']['Enums']['batch_status'];
          total_amount?: number;
          has_discrepancy?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // Batch Items table
      batch_items: {
        Row: {
          id: string;
          batch_id: string;
          linen_category_id: string;
          quantity_sent: number;
          quantity_received: number;
          price_per_item: number;
          subtotal: number;
          discrepancy_details: string | null;
          express_delivery: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          linen_category_id: string;
          quantity_sent?: number;
          quantity_received?: number;
          price_per_item?: number;
          subtotal?: number;
          discrepancy_details?: string | null;
          express_delivery?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          linen_category_id?: string;
          quantity_sent?: number;
          quantity_received?: number;
          price_per_item?: number;
          subtotal?: number;
          discrepancy_details?: string | null;
          express_delivery?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // RFID Data table
      rfid_data: {
        Row: {
          id: string;
          rfid_number: string;
          category: string;
          status: string;
          condition: string | null;
          location: string | null;
          user_name: string | null;
          qty_washed: number;
          washes_remaining: number;
          assigned_location: string | null;
          date_assigned: string | null;
          date_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rfid_number: string;
          category: string;
          status: string;
          condition?: string | null;
          location?: string | null;
          user_name?: string | null;
          qty_washed?: number;
          washes_remaining?: number;
          assigned_location?: string | null;
          date_assigned?: string | null;
          date_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rfid_number?: string;
          category?: string;
          status?: string;
          condition?: string | null;
          location?: string | null;
          user_name?: string | null;
          qty_washed?: number;
          washes_remaining?: number;
          assigned_location?: string | null;
          date_assigned?: string | null;
          date_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: {
      // Batch Report View
      batch_report_view: {
        Row: {
          batch_id: string;
          paper_batch_id: string;
          system_batch_id: string;
          client_name: string;
          contact_number: string | null;
          email: string | null;
          pickup_date: string;
          status: Database['public']['Enums']['batch_status'];
          total_amount: number;
          has_discrepancy: boolean;
          notes: string | null;
          item_count: number;
          total_items_sent: number;
          total_items_received: number;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };

      // Batch Items Detail View
      batch_items_detail_view: {
        Row: {
          item_id: string;
          paper_batch_id: string;
          system_batch_id: string;
          client_name: string;
          linen_category_name: string;
          current_price: number;
          quantity_sent: number;
          quantity_received: number;
          batch_price: number;
          subtotal: number;
          has_discrepancy: boolean;
          discrepancy_amount: number;
          discrepancy_details: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
    };

    Functions: {
      // Get batch summary with client information
      get_batch_summary: {
        Args: {
          batch_uuid: string;
        };
        Returns: {
          batch_id: string;
          paper_batch_id: string;
          system_batch_id: string;
          client_name: string;
          pickup_date: string;
          status: Database['public']['Enums']['batch_status'];
          total_amount: number;
          has_discrepancy: boolean;
          item_count: number;
          total_items_sent: number;
          total_items_received: number;
        }[];
      };

      // Get batch items with linen category details
      get_batch_items_with_details: {
        Args: {
          batch_uuid: string;
        };
        Returns: {
          item_id: string;
          linen_category_name: string;
          quantity_sent: number;
          quantity_received: number;
          price_per_item: number;
          subtotal: number;
          has_discrepancy: boolean;
          discrepancy_details: string | null;
        }[];
      };

      // Get client statistics
      get_client_stats: {
        Args: {
          client_uuid: string;
        };
        Returns: {
          client_name: string;
          total_batches: number;
          total_amount: number;
          batches_with_discrepancies: number;
          last_pickup_date: string | null;
          average_batch_amount: number;
        }[];
      };

      // Get linen category usage statistics
      get_linen_category_stats: {
        Args: {
          category_uuid: string;
        };
        Returns: {
          category_name: string;
          total_quantity_sent: number;
          total_quantity_received: number;
          total_revenue: number;
          average_price: number;
          usage_count: number;
        }[];
      };

      // Generate system batch ID
      generate_system_batch_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };

      // Search batches by various criteria
      search_batches: {
        Args: {
          search_text?: string | null;
          client_id_filter?: string | null;
          status_filter?: Database['public']['Enums']['batch_status'] | null;
          date_from?: string | null;
          date_to?: string | null;
          has_discrepancy_filter?: boolean | null;
        };
        Returns: {
          batch_id: string;
          paper_batch_id: string;
          system_batch_id: string;
          client_name: string;
          pickup_date: string;
          status: Database['public']['Enums']['batch_status'];
          total_amount: number;
          has_discrepancy: boolean;
          item_count: number;
        }[];
      };
    };

    Enums: {
      batch_status: 'pickup' | 'washing' | 'completed' | 'delivered';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Specific table row types
export type Profile = Tables<'profiles'>;
export type LinenCategory = Tables<'linen_categories'>;
export type Client = Tables<'clients'>;
export type ClientFavoriteCategory = Tables<'client_favorite_categories'>;
export type BusinessSettings = Tables<'business_settings'>;
export type Batch = Tables<'batches'>;
export type BatchItem = Tables<'batch_items'>;
export type RFIDData = Tables<'rfid_data'>;

// View types
export type BatchReportView = Views<'batch_report_view'>;
export type BatchItemsDetailView = Views<'batch_items_detail_view'>;

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type LinenCategoryInsert = Database['public']['Tables']['linen_categories']['Insert'];
export type ClientInsert = Database['public']['Tables']['clients']['Insert'];
export type ClientFavoriteCategoryInsert = Database['public']['Tables']['client_favorite_categories']['Insert'];
export type BatchInsert = Database['public']['Tables']['batches']['Insert'];
export type BatchItemInsert = Database['public']['Tables']['batch_items']['Insert'];
export type RFIDDataInsert = Database['public']['Tables']['rfid_data']['Insert'];

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type LinenCategoryUpdate = Database['public']['Tables']['linen_categories']['Update'];
export type ClientUpdate = Database['public']['Tables']['clients']['Update'];
export type ClientFavoriteCategoryUpdate = Database['public']['Tables']['client_favorite_categories']['Update'];
export type BatchUpdate = Database['public']['Tables']['batches']['Update'];
export type BatchItemUpdate = Database['public']['Tables']['batch_items']['Update'];
export type RFIDDataUpdate = Database['public']['Tables']['rfid_data']['Update'];

// Enum types
export type BatchStatus = Enums<'batch_status'>;

// Function return types
export type BatchSummary = Functions<'get_batch_summary'>['Returns'][0];
export type BatchItemsWithDetails = Functions<'get_batch_items_with_details'>['Returns'][0];
export type ClientStats = Functions<'get_client_stats'>['Returns'][0];
export type LinenCategoryStats = Functions<'get_linen_category_stats'>['Returns'][0];
export type BatchSearchResult = Functions<'search_batches'>['Returns'][0];

// Extended types for joined data
export interface BatchWithClient extends Batch {
  client: Client;
}

export interface BatchWithItems extends Batch {
  items: BatchItemWithCategory[];
}

export interface BatchItemWithCategory extends BatchItem {
  linen_category: LinenCategory;
}

export interface BatchWithClientAndItems extends Batch {
  client: Client;
  items: BatchItemWithCategory[];
}

export interface ClientWithBatches extends Client {
  batches: Batch[];
}

export interface LinenCategoryWithUsage extends LinenCategory {
  usage_count: number;
  total_quantity_sent: number;
  total_quantity_received: number;
  total_revenue: number;
}

// Utility types for form handling
export interface BatchFormData {
  paper_batch_id: string;
  client_id: string;
  pickup_date: string;
  status: BatchStatus;
  notes?: string;
  items: BatchItemFormData[];
}

export interface BatchItemFormData {
  linen_category_id: string;
  quantity_sent: number;
  quantity_received: number;
  price_per_item: number;
}

export interface ClientFormData {
  name: string;
  contact_number?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  logo_url?: string;
}

export interface LinenCategoryFormData {
  name: string;
  price_per_item: number;
  is_active: boolean;
  section?: string;
}

// Search and filter types
export interface BatchSearchFilters {
  search_text?: string;
  client_id?: string;
  status?: BatchStatus;
  date_from?: string;
  date_to?: string;
  has_discrepancy?: boolean;
}

export interface BatchItemSearchFilters {
  batch_id?: string;
  linen_category_id?: string;
  has_discrepancy?: boolean;
}

// Statistics and reporting types
export interface DashboardStats {
  total_batches: number;
  total_clients: number;
  total_revenue: number;
  batches_with_discrepancies: number;
  average_batch_amount: number;
  most_used_categories: Array<{
    category_name: string;
    usage_count: number;
  }>;
  recent_batches: BatchWithClient[];
}

export interface ClientReport {
  client: Client;
  stats: ClientStats;
  recent_batches: Batch[];
  total_revenue: number;
}

export interface CategoryReport {
  category: LinenCategory;
  stats: LinenCategoryStats;
  recent_usage: BatchItemWithCategory[];
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// All types are already exported above