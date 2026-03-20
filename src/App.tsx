import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AppShell from "./components/AppShell";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AIControlTower from "./pages/AIControlTower";
import FailureRecovery from "./pages/FailureRecoveryFlow";
import EndUserJourney from "./pages/EndUserJourney";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppShell>
            <Routes>
              {/* Public */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/journey" element={<EndUserJourney />} />

              {/* Protected — employee portal */}
              <Route path="/" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
              <Route path="/portal" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
              <Route path="/employee-portal" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />

              {/* Protected — governance */}
              <Route path="/governance/control-tower" element={<ProtectedRoute><AIControlTower /></ProtectedRoute>} />
              <Route path="/governance/failure-recovery" element={<ProtectedRoute><FailureRecovery /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
