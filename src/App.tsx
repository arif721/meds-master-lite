import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Sales from "./pages/Sales";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Quotations from "./pages/Quotations";
import Adjustments from "./pages/Adjustments";
import Settings from "./pages/Settings";
import AuditLog from "./pages/AuditLog";
import AuditReport from "./pages/AuditReport";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Stores from "./pages/Stores";
import StoreDetails from "./pages/StoreDetails";
import SellerDetails from "./pages/SellerDetails";
import RawMaterials from "./pages/RawMaterials";
import DemoRun from "./pages/DemoRun";
import Samples from "./pages/Samples";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on JWT expired errors
        if (error?.message?.includes('JWT expired') || error?.code === 'PGRST301' || error?.code === 'PGRST303') {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

// Global query error handler
function QueryErrorHandler({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const handleQueryError = async (error: any) => {
      // Check for JWT expiration errors
      if (
        error?.message?.includes('JWT expired') || 
        error?.code === 'PGRST301' || 
        error?.code === 'PGRST303'
      ) {
        console.log('Session expired, logging out...');
        
        // Sign out the user
        await supabase.auth.signOut();
        
        // Show notification
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please login again.",
          variant: "destructive",
        });
        
        // Redirect to auth page
        navigate('/auth', { replace: true });
      }
    };

    // Listen for query errors
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'observerResultsUpdated') {
        const query = event.query;
        if (query.state.error) {
          handleQueryError(query.state.error);
        }
      }
    });

    return () => unsubscribe();
  }, [toast, navigate]);

  return <>{children}</>;
}

// Inner app component that uses routing
function AppRoutes() {
  return (
    <QueryErrorHandler>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/raw-materials" element={<RawMaterials />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/stores" element={<Stores />} />
                  <Route path="/stores/:storeId" element={<StoreDetails />} />
                  <Route path="/quotations" element={<Quotations />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/samples" element={<Samples />} />
                  <Route path="/adjustments" element={<Adjustments />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/sellers/:sellerId" element={<SellerDetails />} />
                  <Route path="/audit-log" element={<AuditLog />} />
                  <Route path="/audit-report" element={<AuditReport />} />
                  <Route path="/demo-run" element={<DemoRun />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </QueryErrorHandler>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
