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
          price_per_wash?: number | null;
          is_active: boolean;
          section: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price_per_item?: number;
          price_per_wash?: number | null;
          is_active?: boolean;
          section?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price_per_item?: number;
          price_per_wash?: number | null;
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

      // Staff: employees table
      employees: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          role: string | null;
          shift_type: 'day' | 'night' | 'both';
          bi_weekly_salary: number;
          monthly_salary: number | null;
          salary_payment_day_1: number;
          salary_payment_day_2: number;
          bank_reference: string | null;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_branch_code: string | null;
          account_type: 'cheque' | 'savings' | null;
          id_number: string | null;
          id_document_url: string | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          role?: string | null;
          shift_type: 'day' | 'night' | 'both';
          bi_weekly_salary?: number;
          monthly_salary?: number | null;
          salary_payment_day_1?: number;
          salary_payment_day_2?: number;
          bank_reference?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_branch_code?: string | null;
          account_type?: 'cheque' | 'savings' | null;
          id_number?: string | null;
          id_document_url?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          role?: string | null;
          shift_type?: 'day' | 'night' | 'both';
          bi_weekly_salary?: number;
          monthly_salary?: number | null;
          salary_payment_day_1?: number;
          salary_payment_day_2?: number;
          bank_reference?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_branch_code?: string | null;
          account_type?: 'cheque' | 'savings' | null;
          id_number?: string | null;
          id_document_url?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // Staff: shift_schedule table
      shift_schedule: {
        Row: {
          id: string;
          employee_id: string;
          day_of_week: number;
          shift_type: 'day' | 'night';
          is_default: boolean;
          week_start_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          day_of_week: number;
          shift_type: 'day' | 'night';
          is_default?: boolean;
          week_start_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          day_of_week?: number;
          shift_type?: 'day' | 'night';
          is_default?: boolean;
          week_start_date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shift_schedule_employee_id_fkey';
            columns: ['employee_id'];
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          }
        ];
      };

      // Staff: absences table
      absences: {
        Row: {
          id: string;
          employee_id: string;
          absence_date: string;
          shift_type: 'day' | 'night';
          cover_employee_id: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          absence_date: string;
          shift_type: 'day' | 'night';
          cover_employee_id?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          absence_date?: string;
          shift_type?: 'day' | 'night';
          cover_employee_id?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'absences_employee_id_fkey';
            columns: ['employee_id'];
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'absences_cover_employee_id_fkey';
            columns: ['cover_employee_id'];
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          }
        ];
      };

      // Staff: payroll_runs table
      payroll_runs: {
        Row: {
          id: string;
          period_start: string;
          period_end: string;
          status: 'draft' | 'approved' | 'paid';
          total_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          period_start: string;
          period_end: string;
          status?: 'draft' | 'approved' | 'paid';
          total_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          period_start?: string;
          period_end?: string;
          status?: 'draft' | 'approved' | 'paid';
          total_amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      // Staff: payroll_entries table
      payroll_entries: {
        Row: {
          id: string;
          payroll_run_id: string;
          employee_id: string;
          bi_weekly_salary: number;
          deductions: number;
          net_pay: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payroll_run_id: string;
          employee_id: string;
          bi_weekly_salary?: number;
          deductions?: number;
          net_pay?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payroll_run_id?: string;
          employee_id?: string;
          bi_weekly_salary?: number;
          deductions?: number;
          net_pay?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payroll_entries_payroll_run_id_fkey';
            columns: ['payroll_run_id'];
            referencedRelation: 'payroll_runs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payroll_entries_employee_id_fkey';
            columns: ['employee_id'];
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          }
        ];
      };

      // Staff: salary_payments table
      salary_payments: {
        Row: {
          id: string;
          employee_id: string;
          payment_date: string;
          payment_number: 1 | 2;
          period_month: number;
          period_year: number;
          gross_amount: number;
          deductions: number;
          net_amount: number;
          status: 'pending' | 'paid' | 'skipped';
          payment_method: string | null;
          notes: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          payment_date: string;
          payment_number: 1 | 2;
          period_month: number;
          period_year: number;
          gross_amount: number;
          deductions?: number;
          net_amount: number;
          status?: 'pending' | 'paid' | 'skipped';
          payment_method?: string | null;
          notes?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          payment_date?: string;
          payment_number?: 1 | 2;
          period_month?: number;
          period_year?: number;
          gross_amount?: number;
          deductions?: number;
          net_amount?: number;
          status?: 'pending' | 'paid' | 'skipped';
          payment_method?: string | null;
          notes?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'salary_payments_employee_id_fkey';
            columns: ['employee_id'];
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          }
        ];
      };

      // RFID Invoices table
      rfid_invoices: {
        Row: {
          id: string;
          invoice_number: string;
          location: string;
          generated_by: string | null;
          period_date: string;
          total_items: number;
          subtotal: number;
          vat_amount: number;
          grand_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          location: string;
          generated_by?: string | null;
          period_date?: string;
          total_items?: number;
          subtotal?: number;
          vat_amount?: number;
          grand_total?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_number?: string;
          location?: string;
          generated_by?: string | null;
          period_date?: string;
          total_items?: number;
          subtotal?: number;
          vat_amount?: number;
          grand_total?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      // RFID Invoice Items table
      rfid_invoice_items: {
        Row: {
          id: string;
          rfid_invoice_id: string;
          rfid_number: string;
          category: string;
          qty_washed: number;
          washes_remaining: number;
          price_per_wash: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          rfid_invoice_id: string;
          rfid_number: string;
          category: string;
          qty_washed?: number;
          washes_remaining?: number;
          price_per_wash?: number;
          line_total?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          rfid_invoice_id?: string;
          rfid_number?: string;
          category?: string;
          qty_washed?: number;
          washes_remaining?: number;
          price_per_wash?: number;
          line_total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rfid_invoice_items_rfid_invoice_id_fkey';
            columns: ['rfid_invoice_id'];
            referencedRelation: 'rfid_invoices';
            referencedColumns: ['id'];
          }
        ];
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

      // RFID Items (RSL Express lifecycle tracking)
      rfid_items: {
        Row: {
          id: string;
          rfid_number: string;
          category: string;
          total_washes_lifetime: number;
          washes_remaining: number;
          status: 'active' | 'near_end' | 'retired';
          last_seen: string | null;
          location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rfid_number: string;
          category: string;
          total_washes_lifetime?: number;
          washes_remaining?: number;
          status?: 'active' | 'near_end' | 'retired';
          last_seen?: string | null;
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rfid_number?: string;
          category?: string;
          total_washes_lifetime?: number;
          washes_remaining?: number;
          status?: 'active' | 'near_end' | 'retired';
          last_seen?: string | null;
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // RFID Batches
      rfid_batches: {
        Row: {
          id: string;
          batch_ref: string;
          location: string;
          scanned_by: string | null;
          scan_date: string;
          total_items: number;
          total_washes: number;
          subtotal: number;
          vat_amount: number;
          grand_total: number;
          status: 'draft' | 'invoiced' | 'paid';
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_ref: string;
          location: string;
          scanned_by?: string | null;
          scan_date?: string;
          total_items?: number;
          total_washes?: number;
          subtotal?: number;
          vat_amount?: number;
          grand_total?: number;
          status?: 'draft' | 'invoiced' | 'paid';
          created_at?: string;
        };
        Update: {
          id?: string;
          batch_ref?: string;
          location?: string;
          scanned_by?: string | null;
          scan_date?: string;
          total_items?: number;
          total_washes?: number;
          subtotal?: number;
          vat_amount?: number;
          grand_total?: number;
          status?: 'draft' | 'invoiced' | 'paid';
          created_at?: string;
        };
        Relationships: [];
      };

      // RFID Batch Items
      rfid_batch_items: {
        Row: {
          id: string;
          batch_id: string;
          rfid_number: string;
          category: string;
          qty_washed_this_batch: number;
          washes_remaining_after: number;
          price_per_wash: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          rfid_number: string;
          category: string;
          qty_washed_this_batch?: number;
          washes_remaining_after?: number;
          price_per_wash?: number;
          line_total?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          rfid_number?: string;
          category?: string;
          qty_washed_this_batch?: number;
          washes_remaining_after?: number;
          price_per_wash?: number;
          line_total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rfid_batch_items_batch_id_fkey';
            columns: ['batch_id'];
            referencedRelation: 'rfid_batches';
            referencedColumns: ['id'];
          }
        ];
      };

      // Expenses Categories
      expenses_categories: {
        Row: {
          id: string;
          name: string;
          icon: string | null;
          is_fixed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string | null;
          is_fixed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string | null;
          is_fixed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      // Expenses
      expenses: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          amount: number;
          expense_date: string;
          period_month: number;
          period_year: number;
          is_recurring: boolean;
          notes: string | null;
          receipt_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          amount: number;
          expense_date: string;
          period_month: number;
          period_year: number;
          is_recurring?: boolean;
          notes?: string | null;
          receipt_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          amount?: number;
          expense_date?: string;
          period_month?: number;
          period_year?: number;
          is_recurring?: boolean;
          notes?: string | null;
          receipt_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'expenses_categories';
            referencedColumns: ['id'];
          }
        ];
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
export type RFIDInvoice = Tables<'rfid_invoices'>;
export type RFIDInvoiceItem = Tables<'rfid_invoice_items'>;
export type RFIDData = Tables<'rfid_data'>;
export type Employee = Tables<'employees'>;
export type ShiftSchedule = Tables<'shift_schedule'>;
export type Absence = Tables<'absences'>;
export type PayrollRun = Tables<'payroll_runs'>;
export type PayrollEntry = Tables<'payroll_entries'>;
export type SalaryPayment = Tables<'salary_payments'>;

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
export type RFIDInvoiceInsert = Database['public']['Tables']['rfid_invoices']['Insert'];
export type RFIDInvoiceItemInsert = Database['public']['Tables']['rfid_invoice_items']['Insert'];
export type RFIDDataInsert = Database['public']['Tables']['rfid_data']['Insert'];
export type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
export type ShiftScheduleInsert = Database['public']['Tables']['shift_schedule']['Insert'];
export type AbsenceInsert = Database['public']['Tables']['absences']['Insert'];
export type PayrollRunInsert = Database['public']['Tables']['payroll_runs']['Insert'];
export type PayrollEntryInsert = Database['public']['Tables']['payroll_entries']['Insert'];
export type SalaryPaymentInsert = Database['public']['Tables']['salary_payments']['Insert'];

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type LinenCategoryUpdate = Database['public']['Tables']['linen_categories']['Update'];
export type ClientUpdate = Database['public']['Tables']['clients']['Update'];
export type ClientFavoriteCategoryUpdate = Database['public']['Tables']['client_favorite_categories']['Update'];
export type BatchUpdate = Database['public']['Tables']['batches']['Update'];
export type BatchItemUpdate = Database['public']['Tables']['batch_items']['Update'];
export type RFIDInvoiceUpdate = Database['public']['Tables']['rfid_invoices']['Update'];
export type RFIDInvoiceItemUpdate = Database['public']['Tables']['rfid_invoice_items']['Update'];
export type RFIDDataUpdate = Database['public']['Tables']['rfid_data']['Update'];
export type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];
export type ShiftScheduleUpdate = Database['public']['Tables']['shift_schedule']['Update'];
export type AbsenceUpdate = Database['public']['Tables']['absences']['Update'];
export type PayrollRunUpdate = Database['public']['Tables']['payroll_runs']['Update'];
export type PayrollEntryUpdate = Database['public']['Tables']['payroll_entries']['Update'];
export type SalaryPaymentUpdate = Database['public']['Tables']['salary_payments']['Update'];

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

// Staff helper types
export interface EmployeeWithSchedule extends Employee {
  shift_schedule?: ShiftSchedule[];
}

export interface DayRoster {
  dayOfWeek: number;
  date: string;
  day: Employee[];
  night: Employee[];
}

export interface PayrollEntryWithEmployee extends PayrollEntry {
  employee: Employee;
}

export interface PayrollRunWithEntries extends PayrollRun {
  entries: PayrollEntryWithEmployee[];
}

export interface SalaryPaymentWithEmployee extends SalaryPayment {
  employee: Employee;
}

export interface EmployeeSalarySchedule {
  employee: Employee;
  payment_1: { date: string; amount: number; status: string };
  payment_2: { date: string; amount: number; status: string };
  monthly_total: number;
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

// Expense types
export type ExpenseCategory = Tables<'expenses_categories'>;
export type Expense = Tables<'expenses'>;
export interface ExpenseWithCategory extends Expense {
  category: ExpenseCategory;
}
export interface MonthlyExpenseSummary {
  month: number;
  year: number;
  total: number;
  by_category: Array<{
    category_name: string;
    total: number;
    count: number;
    is_fixed?: boolean;
  }>;
}
export interface ProfitLossSummary {
  period: string;
  revenue: number;
  expenses: number;
  gross_profit: number;
  net_profit: number;
  margin_percentage: number;
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