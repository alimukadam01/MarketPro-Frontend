import { ToastContainer } from "react-toastify";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from '../services/AuthProvider'
import Index from "./pages/Index";

import Sales from "./pages/Sales";
import CreateSalesInvoice from "./pages/CreateSalesInvoice";
import UpdateSalesInvoice from "./pages/UpdateSalesInvoice";

import Purchases from "./pages/Purchases";
import CreatePurchaseInvoice from "./pages/CreatePurchaseInvoice";
import UpdatePurchaseInvoice from "./pages/UpdatePurchaseInvoice";

import Products from "./pages/Products";
import CreateProduct from "./pages/CreateProduct";
import UpdateProduct from "./pages/UpdateProduct";

import InventoryOverview from "./pages/InventoryOverview";
import CreateInventoryItem from "./pages/CreateInventoryItem";
import UpdateInventoryItem from "./pages/UpdateInventoryItem";

import Customers from "./pages/Customers"
import CreateCustomer from "./pages/CreateCustomer"
import UpdateCustomer from "./pages/UpdateCustomer"

import Suppliers from "./pages/Suppliers";
import CreateSupplier from "./pages/CreateSupplier"
import UpdateSupplier from "./pages/UpdateSupplier"

import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Locations from "./pages/Locations";
import CreateLocation from "./pages/CreateLocation";
import UpdateLocation from "./pages/UpdateLocation";
import ReturnedItems from "./pages/ReturnedItems";
import UpdateReturnedItem from "./pages/UpdateReturnedItem";
import Expenses from "./pages/Expenses";
import CreateExpense from "./pages/CreateExpense";
import UpdateExpense from "./pages/UpdateExpense";

const queryClient = new QueryClient();

const App = () => {
  
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/create-invoice" element={<CreateSalesInvoice />} />
          <Route path="/sales/update-invoice" element={<UpdateSalesInvoice />} />
          
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/purchases/create-invoice" element={<CreatePurchaseInvoice />} />
          <Route path="/purchases/update-invoice" element={<UpdatePurchaseInvoice />} />
          
          <Route path="/inventory" element={<InventoryOverview />} />
          <Route path="/inventory/create-item" element={<CreateInventoryItem />} />
          <Route path="/inventory/update-item" element={<UpdateInventoryItem />} />
          
          <Route path="/products" element={<Products />} />
          <Route path="/products/create-product" element={<CreateProduct />} />
          <Route path="/products/update-product" element={<UpdateProduct />} />
          
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/create-customer" element={<CreateCustomer />} />
          <Route path="/customers/update-customer" element={<UpdateCustomer />} />

          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/suppliers/create-supplier" element={<CreateSupplier />} />
          <Route path="/suppliers/update-supplier" element={<UpdateSupplier />} />

          <Route path="/locations" element={<Locations />} />
          <Route path="/locations/create-location" element={<CreateLocation />} />
          <Route path="/locations/update-location" element={<UpdateLocation />} />
          
          <Route path="/expenses" element={<Expenses/>} />
          <Route path="/expenses/create-expense" element={<CreateExpense />} />
          <Route path="/expenses/update-expense" element={<UpdateExpense />} />
          
          <Route path="/returned-items" element={<ReturnedItems />} />
          <Route path="/returned-items/update-returned-item" element={<UpdateReturnedItem />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
      </BrowserRouter>
    <ToastContainer />
    </TooltipProvider>
  </QueryClientProvider>
)};

export default App;
