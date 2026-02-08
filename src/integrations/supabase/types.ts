export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          changes: Json | null
          entity_id: string
          entity_name: string | null
          entity_type: Database["public"]["Enums"]["audit_entity_type"]
          id: string
          timestamp: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          changes?: Json | null
          entity_id: string
          entity_name?: string | null
          entity_type: Database["public"]["Enums"]["audit_entity_type"]
          id?: string
          timestamp?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          changes?: Json | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: Database["public"]["Enums"]["audit_entity_type"]
          id?: string
          timestamp?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      batches: {
        Row: {
          batch_number: string
          cost_price: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          expiry_date: string | null
          id: string
          is_deleted: boolean
          product_id: string
          quantity: number
        }
        Insert: {
          batch_number: string
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          expiry_date?: string | null
          id?: string
          is_deleted?: boolean
          product_id: string
          quantity?: number
        }
        Update: {
          batch_number?: string
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          expiry_date?: string | null
          id?: string
          is_deleted?: boolean
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          name: string
          phone: string | null
          seller_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          phone?: string | null
          seller_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          phone?: string | null
          seller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          batch_id: string | null
          cost_price: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          free_quantity: number
          id: string
          invoice_id: string
          product_id: string
          quantity: number
          returned_quantity: number
          total: number
          tp_rate: number
          unit_price: number
        }
        Insert: {
          batch_id?: string | null
          cost_price?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          free_quantity?: number
          id?: string
          invoice_id: string
          product_id: string
          quantity?: number
          returned_quantity?: number
          total?: number
          tp_rate?: number
          unit_price?: number
        }
        Update: {
          batch_id?: string | null
          cost_price?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          free_quantity?: number
          id?: string
          invoice_id?: string
          product_id?: string
          quantity?: number
          returned_quantity?: number
          total?: number
          tp_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          discount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          due: number
          id: string
          invoice_number: string
          is_deleted: boolean
          notes: string | null
          paid: number
          sale_date_time: string | null
          seller_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          store_id: string | null
          subtotal: number
          total: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          due?: number
          id?: string
          invoice_number: string
          is_deleted?: boolean
          notes?: string | null
          paid?: number
          sale_date_time?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          store_id?: string | null
          subtotal?: number
          total?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          due?: number
          id?: string
          invoice_number?: string
          is_deleted?: boolean
          notes?: string | null
          paid?: number
          sale_date_time?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          store_id?: string | null
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          invoice_id: string
          is_deleted: boolean
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          invoice_id: string
          is_deleted?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          invoice_id?: string
          is_deleted?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category_id: string | null
          cost_price: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          name: string
          sales_price: number
          sku: string | null
          tp_rate: number
          unit: Database["public"]["Enums"]["product_unit"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          sales_price?: number
          sku?: string | null
          tp_rate?: number
          unit?: Database["public"]["Enums"]["product_unit"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          sales_price?: number
          sku?: string | null
          tp_rate?: number
          unit?: Database["public"]["Enums"]["product_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_lines: {
        Row: {
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          mrp: number
          product_id: string
          quantity: number
          quotation_id: string
          total: number
          tp_rate: number
          unit_price: number
        }
        Insert: {
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          mrp?: number
          product_id: string
          quantity?: number
          quotation_id: string
          total?: number
          tp_rate?: number
          unit_price?: number
        }
        Update: {
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          mrp?: number
          product_id?: string
          quantity?: number
          quotation_id?: string
          total?: number
          tp_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_lines_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          customer_id: string
          discount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          id: string
          notes: string | null
          quotation_number: string
          seller_id: string | null
          status: Database["public"]["Enums"]["quotation_status"]
          store_id: string | null
          subtotal: number
          total: number
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          id?: string
          notes?: string | null
          quotation_number: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          store_id?: string | null
          subtotal?: number
          total?: number
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          id?: string
          notes?: string | null
          quotation_number?: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          store_id?: string | null
          subtotal?: number
          total?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_material_lots: {
        Row: {
          coa_document: string | null
          created_at: string
          current_balance: number
          deleted_at: string | null
          deleted_by: string | null
          expiry_date: string | null
          id: string
          is_deleted: boolean
          location: string | null
          lot_number: string
          material_id: string
          quantity_received: number
          received_date: string
          unit_cost: number
        }
        Insert: {
          coa_document?: string | null
          created_at?: string
          current_balance?: number
          deleted_at?: string | null
          deleted_by?: string | null
          expiry_date?: string | null
          id?: string
          is_deleted?: boolean
          location?: string | null
          lot_number: string
          material_id: string
          quantity_received?: number
          received_date?: string
          unit_cost?: number
        }
        Update: {
          coa_document?: string | null
          created_at?: string
          current_balance?: number
          deleted_at?: string | null
          deleted_by?: string | null
          expiry_date?: string | null
          id?: string
          is_deleted?: boolean
          location?: string | null
          lot_number?: string
          material_id?: string
          quantity_received?: number
          received_date?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "raw_material_lots_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_material_movements: {
        Row: {
          created_at: string
          created_by: string | null
          from_location: string | null
          id: string
          invoice_number: string | null
          lot_id: string | null
          material_id: string
          notes: string | null
          quantity: number
          reason: string | null
          reference: string | null
          supplier: string | null
          to_location: string | null
          type: Database["public"]["Enums"]["rm_movement_type"]
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_location?: string | null
          id?: string
          invoice_number?: string | null
          lot_id?: string | null
          material_id: string
          notes?: string | null
          quantity: number
          reason?: string | null
          reference?: string | null
          supplier?: string | null
          to_location?: string | null
          type: Database["public"]["Enums"]["rm_movement_type"]
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_location?: string | null
          id?: string
          invoice_number?: string | null
          lot_id?: string | null
          material_id?: string
          notes?: string | null
          quantity?: number
          reason?: string | null
          reference?: string | null
          supplier?: string | null
          to_location?: string | null
          type?: Database["public"]["Enums"]["rm_movement_type"]
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_material_movements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "raw_material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_material_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_materials: {
        Row: {
          active: boolean
          conversion_factor: number | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          hazard_class: string | null
          id: string
          is_deleted: boolean
          min_stock: number | null
          name: string
          purchase_unit: Database["public"]["Enums"]["raw_material_unit"] | null
          reorder_level: number | null
          storage_condition:
            | Database["public"]["Enums"]["storage_condition"]
            | null
          strength_purity: string | null
          supplier: string | null
          type: Database["public"]["Enums"]["raw_material_type"]
          unit: Database["public"]["Enums"]["raw_material_unit"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          conversion_factor?: number | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          hazard_class?: string | null
          id?: string
          is_deleted?: boolean
          min_stock?: number | null
          name: string
          purchase_unit?:
            | Database["public"]["Enums"]["raw_material_unit"]
            | null
          reorder_level?: number | null
          storage_condition?:
            | Database["public"]["Enums"]["storage_condition"]
            | null
          strength_purity?: string | null
          supplier?: string | null
          type?: Database["public"]["Enums"]["raw_material_type"]
          unit?: Database["public"]["Enums"]["raw_material_unit"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          conversion_factor?: number | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          hazard_class?: string | null
          id?: string
          is_deleted?: boolean
          min_stock?: number | null
          name?: string
          purchase_unit?:
            | Database["public"]["Enums"]["raw_material_unit"]
            | null
          reorder_level?: number | null
          storage_condition?:
            | Database["public"]["Enums"]["storage_condition"]
            | null
          strength_purity?: string | null
          supplier?: string | null
          type?: Database["public"]["Enums"]["raw_material_type"]
          unit?: Database["public"]["Enums"]["raw_material_unit"]
          updated_at?: string
        }
        Relationships: []
      }
      sample_lines: {
        Row: {
          batch_id: string | null
          cost_price: number
          id: string
          product_id: string
          quantity: number
          sample_id: string
          total: number
          tp_rate: number
        }
        Insert: {
          batch_id?: string | null
          cost_price?: number
          id?: string
          product_id: string
          quantity?: number
          sample_id: string
          total?: number
          tp_rate?: number
        }
        Update: {
          batch_id?: string | null
          cost_price?: number
          id?: string
          product_id?: string
          quantity?: number
          sample_id?: string
          total?: number
          tp_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "sample_lines_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_lines_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "samples"
            referencedColumns: ["id"]
          },
        ]
      }
      samples: {
        Row: {
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          notes: string | null
          receiver_name: string | null
          receiver_phone: string | null
          sale_date_time: string
          sample_number: string
          seller_id: string | null
          store_id: string | null
          total_value: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          sale_date_time?: string
          sample_number: string
          seller_id?: string | null
          store_id?: string | null
          total_value?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          sale_date_time?: string
          sample_number?: string
          seller_id?: string | null
          store_id?: string | null
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "samples_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samples_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samples_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          active: boolean
          address: string | null
          commission_type: Database["public"]["Enums"]["commission_type"]
          commission_value: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          designation: string | null
          id: string
          is_deleted: boolean
          name: string
          phone: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          commission_type?: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          designation?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          phone?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          commission_type?: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          designation?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      signatures: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_default: boolean
          name: string
          seller_id: string | null
          signature_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_default?: boolean
          name: string
          seller_id?: string | null
          signature_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_default?: boolean
          name?: string
          seller_id?: string | null
          signature_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          invoice_id: string | null
          product_id: string
          quantity: number
          reason: string | null
          return_action: Database["public"]["Enums"]["return_action"] | null
          return_value: number | null
          type: Database["public"]["Enums"]["adjustment_type"]
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          return_action?: Database["public"]["Enums"]["return_action"] | null
          return_value?: number | null
          type: Database["public"]["Enums"]["adjustment_type"]
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          return_action?: Database["public"]["Enums"]["return_action"] | null
          return_value?: number | null
          type?: Database["public"]["Enums"]["adjustment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          reference: string | null
          type: Database["public"]["Enums"]["stock_ledger_type"]
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          reference?: string | null
          type: Database["public"]["Enums"]["stock_ledger_type"]
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference?: string | null
          type?: Database["public"]["Enums"]["stock_ledger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          active: boolean
          address: string | null
          contact_person: string | null
          created_at: string
          credit_limit: number
          customer_code: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          name: string
          payment_terms: Database["public"]["Enums"]["payment_terms"]
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number
          customer_code?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          payment_terms?: Database["public"]["Enums"]["payment_terms"]
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number
          customer_code?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          payment_terms?: Database["public"]["Enums"]["payment_terms"]
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_customer_code: { Args: never; Returns: string }
    }
    Enums: {
      adjustment_type:
        | "DAMAGE"
        | "EXPIRED"
        | "LOST"
        | "FOUND"
        | "CORRECTION"
        | "RETURN"
      audit_action: "CREATE" | "UPDATE" | "DELETE"
      audit_entity_type:
        | "PRODUCT"
        | "BATCH"
        | "CUSTOMER"
        | "SELLER"
        | "INVOICE"
        | "PAYMENT"
        | "QUOTATION"
        | "ADJUSTMENT"
        | "CATEGORY"
      commission_type: "PERCENTAGE" | "FIXED"
      discount_type: "AMOUNT" | "PERCENT"
      invoice_status: "DRAFT" | "CONFIRMED" | "PAID" | "PARTIAL" | "CANCELLED"
      payment_method: "CASH" | "BANK" | "BKASH" | "NAGAD" | "CHECK" | "OTHER"
      payment_terms: "CASH" | "7_DAYS" | "15_DAYS" | "21_DAYS" | "30_DAYS"
      product_unit:
        | "Tablet"
        | "Capsule"
        | "Bottle"
        | "Box"
        | "Strip"
        | "Piece"
        | "Tube"
        | "Jar"
        | "Pot"
      quotation_status:
        | "DRAFT"
        | "SENT"
        | "ACCEPTED"
        | "REJECTED"
        | "EXPIRED"
        | "CONVERTED"
      raw_material_type: "CHEMICAL" | "HERB" | "PACKAGING" | "OTHER"
      raw_material_unit: "g" | "kg" | "ml" | "l" | "pcs"
      return_action: "RESTOCK" | "SCRAP"
      rm_movement_type:
        | "OPENING"
        | "RECEIVE"
        | "PURCHASE"
        | "PRODUCTION"
        | "SAMPLE"
        | "WASTE"
        | "TRANSFER_IN"
        | "TRANSFER_OUT"
        | "ADJUSTMENT"
      stock_ledger_type:
        | "OPENING"
        | "PURCHASE"
        | "SALE"
        | "RETURN"
        | "ADJUSTMENT"
        | "DAMAGE"
        | "EXPIRED"
        | "FREE"
      storage_condition: "DRY" | "COOL" | "FRIDGE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      adjustment_type: [
        "DAMAGE",
        "EXPIRED",
        "LOST",
        "FOUND",
        "CORRECTION",
        "RETURN",
      ],
      audit_action: ["CREATE", "UPDATE", "DELETE"],
      audit_entity_type: [
        "PRODUCT",
        "BATCH",
        "CUSTOMER",
        "SELLER",
        "INVOICE",
        "PAYMENT",
        "QUOTATION",
        "ADJUSTMENT",
        "CATEGORY",
      ],
      commission_type: ["PERCENTAGE", "FIXED"],
      discount_type: ["AMOUNT", "PERCENT"],
      invoice_status: ["DRAFT", "CONFIRMED", "PAID", "PARTIAL", "CANCELLED"],
      payment_method: ["CASH", "BANK", "BKASH", "NAGAD", "CHECK", "OTHER"],
      payment_terms: ["CASH", "7_DAYS", "15_DAYS", "21_DAYS", "30_DAYS"],
      product_unit: [
        "Tablet",
        "Capsule",
        "Bottle",
        "Box",
        "Strip",
        "Piece",
        "Tube",
        "Jar",
        "Pot",
      ],
      quotation_status: [
        "DRAFT",
        "SENT",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
        "CONVERTED",
      ],
      raw_material_type: ["CHEMICAL", "HERB", "PACKAGING", "OTHER"],
      raw_material_unit: ["g", "kg", "ml", "l", "pcs"],
      return_action: ["RESTOCK", "SCRAP"],
      rm_movement_type: [
        "OPENING",
        "RECEIVE",
        "PURCHASE",
        "PRODUCTION",
        "SAMPLE",
        "WASTE",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "ADJUSTMENT",
      ],
      stock_ledger_type: [
        "OPENING",
        "PURCHASE",
        "SALE",
        "RETURN",
        "ADJUSTMENT",
        "DAMAGE",
        "EXPIRED",
        "FREE",
      ],
      storage_condition: ["DRY", "COOL", "FRIDGE"],
    },
  },
} as const
