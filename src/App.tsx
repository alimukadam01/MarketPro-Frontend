import { ToastContainer } from "react-toastify";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from '../services/AuthProvider'
import ProtectedRoute from './components/ProtectedRoute'
import Index from "./pages/Index";
import Employees from "./pages/Employees";

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
import ViewCustomer from "./pages/ViewCustomer"

import Suppliers from "./pages/Suppliers";
import CreateSupplier from "./pages/CreateSupplier"
import ViewSupplier from "./pages/ViewSupplier"

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
import Projects from "./pages/Projects";
import CreateProject from "./pages/CreateProject";
import PurchaseQuotations from "./pages/PurchaseQuotations";
import CreatePurchaseQuotation from "./pages/CreatePurchaseQuotation";
import UpdatePurchaseQuotation from "./pages/UpdatePurchaseQuotation";
import ViewProject from "./pages/ViewProject";
import CreateProjectTask from "./pages/CreateProjectTask";
import UpdateProjectTask from "./pages/UpdateProjectTask";
import Backlog from "./pages/Backlog";
import CreateBacklogEntry from "./pages/CreateBacklogEntry";
import UpdateBacklogEntry from "./pages/UpdateBacklogEntry";
import Accounting from "./pages/Accounting";
import CreateTransaction from "./pages/CreateTransaction";
import UpdateTransaction from "./pages/UpdateTransaction";
import DailyBook from "./pages/DailyBook";
import Ledgers from "./pages/Ledgers";
import PartyLedger from "./pages/PartyLedger";
import MoneyAccounts from "./pages/MoneyAccounts";
import Cheques from "./pages/Cheques";

const queryClient = new QueryClient();

const App = () => {
  
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner duration={3000} closeButton={true}/>
      <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Dashboard — token-only guard, no module check */}
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />

          {/* Sales */}
          <Route path="/sales" element={<ProtectedRoute module="sales"><Sales /></ProtectedRoute>} />
          <Route path="/sales/create-invoice" element={<ProtectedRoute module="sales" action="create"><CreateSalesInvoice /></ProtectedRoute>} />
          <Route path="/sales/update-invoice" element={<ProtectedRoute module="sales" action="edit"><UpdateSalesInvoice /></ProtectedRoute>} />

          {/* Purchases */}
          <Route path="/purchases" element={<ProtectedRoute module="purchases"><Purchases /></ProtectedRoute>} />
          <Route path="/purchases/create-invoice" element={<ProtectedRoute module="purchases" action="create"><CreatePurchaseInvoice /></ProtectedRoute>} />
          <Route path="/purchases/update-invoice" element={<ProtectedRoute module="purchases" action="edit"><UpdatePurchaseInvoice /></ProtectedRoute>} />

          {/* Inventory */}
          <Route path="/inventory" element={<ProtectedRoute module="inventory"><InventoryOverview /></ProtectedRoute>} />
          <Route path="/inventory/create-item" element={<ProtectedRoute module="inventory" action="create"><CreateInventoryItem /></ProtectedRoute>} />
          <Route path="/inventory/update-item" element={<ProtectedRoute module="inventory" action="edit"><UpdateInventoryItem /></ProtectedRoute>} />

          {/* Products */}
          <Route path="/products" element={<ProtectedRoute module="products"><Products /></ProtectedRoute>} />
          <Route path="/products/create-product" element={<ProtectedRoute module="products" action="create"><CreateProduct /></ProtectedRoute>} />
          <Route path="/products/update-product" element={<ProtectedRoute module="products" action="edit"><UpdateProduct /></ProtectedRoute>} />

          {/* Customers */}
          <Route path="/customers" element={<ProtectedRoute module="customers"><Customers /></ProtectedRoute>} />
          <Route path="/customers/create-customer" element={<ProtectedRoute module="customers" action="create"><CreateCustomer /></ProtectedRoute>} />
          <Route path="/customers/view-customer" element={<ProtectedRoute module="customers"><ViewCustomer /></ProtectedRoute>} />

          {/* Suppliers */}
          <Route path="/suppliers" element={<ProtectedRoute module="suppliers"><Suppliers /></ProtectedRoute>} />
          <Route path="/suppliers/create-supplier" element={<ProtectedRoute module="suppliers" action="create"><CreateSupplier /></ProtectedRoute>} />
          <Route path="/suppliers/view-supplier" element={<ProtectedRoute module="suppliers"><ViewSupplier /></ProtectedRoute>} />

          {/* Locations */}
          <Route path="/locations" element={<ProtectedRoute module="locations"><Locations /></ProtectedRoute>} />
          <Route path="/locations/create-location" element={<ProtectedRoute module="locations" action="create"><CreateLocation /></ProtectedRoute>} />
          <Route path="/locations/update-location" element={<ProtectedRoute module="locations" action="edit"><UpdateLocation /></ProtectedRoute>} />

          {/* Expenses */}
          <Route path="/expenses" element={<ProtectedRoute module="expenses"><Expenses /></ProtectedRoute>} />
          <Route path="/expenses/create-expense" element={<ProtectedRoute module="expenses" action="create"><CreateExpense /></ProtectedRoute>} />
          <Route path="/expenses/update-expense" element={<ProtectedRoute module="expenses" action="edit"><UpdateExpense /></ProtectedRoute>} />

          {/* Purchase Quotations */}
          <Route path="/purchase-quotations" element={<ProtectedRoute module="quotations"><PurchaseQuotations /></ProtectedRoute>} />
          <Route path="/purchase-quotations/create-purchase-quotation" element={<ProtectedRoute module="quotations" action="create"><CreatePurchaseQuotation /></ProtectedRoute>} />
          <Route path="/purchase-quotations/update-purchase-quotation" element={<ProtectedRoute module="quotations" action="edit"><UpdatePurchaseQuotation /></ProtectedRoute>} />

          {/* Returned Items */}
          <Route path="/returned-items" element={<ProtectedRoute module="returned_items"><ReturnedItems /></ProtectedRoute>} />
          <Route path="/returned-items/update-returned-item" element={<ProtectedRoute module="returned_items" action="edit"><UpdateReturnedItem /></ProtectedRoute>} />

          {/* Projects */}
          <Route path="/projects" element={<ProtectedRoute module="projects"><Projects /></ProtectedRoute>} />
          <Route path="/projects/create-project" element={<ProtectedRoute module="projects" action="create"><CreateProject /></ProtectedRoute>} />
          <Route path="/projects/view-project" element={<ProtectedRoute module="projects" ><ViewProject /></ProtectedRoute>} />
          <Route path="/projects/create-task" element={<ProtectedRoute module="projects" action="create"><CreateProjectTask /></ProtectedRoute>} />
          <Route path="/projects/update-task" element={<ProtectedRoute module="projects" action="edit"><UpdateProjectTask /></ProtectedRoute>} />

          {/* Backlog */}
          <Route path="/backlog" element={<ProtectedRoute><Backlog /></ProtectedRoute>} />
          <Route path="/backlog/create-entry" element={<ProtectedRoute><CreateBacklogEntry /></ProtectedRoute>} />
          <Route path="/backlog/update-entry" element={<ProtectedRoute><UpdateBacklogEntry /></ProtectedRoute>} />

          {/* Accounting */}
          <Route path="/accounting" element={<ProtectedRoute module="accounting"><Accounting /></ProtectedRoute>} />
          <Route path="/accounting/create-transaction" element={<ProtectedRoute module="accounting" action="create"><CreateTransaction /></ProtectedRoute>} />
          <Route path="/accounting/update-transaction" element={<ProtectedRoute module="accounting" action="edit"><UpdateTransaction /></ProtectedRoute>} />
          <Route path="/accounting/daily-book" element={<ProtectedRoute module="accounting"><DailyBook /></ProtectedRoute>} />
          <Route path="/accounting/ledgers" element={<ProtectedRoute module="accounting"><Ledgers /></ProtectedRoute>} />
          <Route path="/accounting/party-ledger" element={<ProtectedRoute module="accounting"><PartyLedger /></ProtectedRoute>} />
          <Route path="/accounting/accounts" element={<ProtectedRoute module="accounting"><MoneyAccounts /></ProtectedRoute>} />
          <Route path="/accounting/cheques" element={<ProtectedRoute module="accounting"><Cheques /></ProtectedRoute>} />

          {/* Employees — admin only (ProtectedRoute token check; page itself guards role) */}
          <Route path="/employees" element={<ProtectedRoute module="employees" action="create"><Employees /></ProtectedRoute>} />

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
