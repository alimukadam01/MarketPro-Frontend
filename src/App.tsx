import { ToastContainer } from "react-toastify";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Sales from "./pages/Sales";
import Purchases from "./pages/Purchases";
import CreateSalesInvoice from "./pages/CreateSalesInvoice";
import UpdateSalesInvoice from "./pages/UpdateSalesInvoice";
import CreatePurchaseInvoice from "./pages/CreatePurchaseInvoice";
import UpdatePurchaseInvoice from "./pages/UpdatePurchaseInvoice";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/create-invoice" element={<CreateSalesInvoice />} />
          <Route path="/sales/update-invoice" element={<UpdateSalesInvoice />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/purchases/create-invoice" element={<CreatePurchaseInvoice />} />
          <Route path="/purchases/update-invoice" element={<UpdatePurchaseInvoice />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    <ToastContainer />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
