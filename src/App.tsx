import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
        <AppShell>
          <Routes>
            {/* iOPEX FrontDoor — employee daily portal */}
            <Route path="/" element={<EmployeeDashboard />} />
            <Route path="/portal" element={<EmployeeDashboard />} />
            <Route path="/employee-portal" element={<EmployeeDashboard />} />

            {/* iOPEX Governance — exec/admin surfaces */}
            <Route path="/governance/control-tower" element={<AIControlTower />} />
            <Route path="/governance/failure-recovery" element={<FailureRecovery />} />

            {/* End User Journey — employee value story */}
            <Route path="/journey" element={<EndUserJourney />} />

            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
