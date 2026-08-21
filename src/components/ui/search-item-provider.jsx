import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  User,
  FileText,
  ShoppingCart,
  Package,
  Archive,
  Undo2,
  PackageOpen,
  Truck,
  Users,
  MapPin,
  Wallet2,
} from "lucide-react";
import {
  transformProduct,
  transformPurchaseInvoice,
  transformSalesInvoice,
  SalesInvoiceStatusMap,
  transformCustomer,
  transformReturnedItem,
} from "../../../services/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

// include on-off switch
// implement clickable links

function SearchSalesInvoices({ data, toggleResults }) {
  const invoices = data.map(transformSalesInvoice);
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">
          Sales Invoices
        </h3>
      </div>
      <div className="space-y-2">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() => {
              toggleResults(false)
              navigate("/sales/update-invoice", {
                state: {
                  invoice_id: invoice.id,
                },
                replace: true,
              })}
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">
                  Invoice ID: {invoice.id} | {invoice.invoice_no}
                </p>
                <p className="text-xs text-muted-foreground">
                  {SalesInvoiceStatusMap[invoice.status]}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-foreground">
                  {invoice.total}
                </p>
                <p className="text-xs text-muted-foreground">
                  Issued at: {invoice.date_issued}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchSalesInvoiceItems({ data, toggleResults }) {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">
          Sales Invoice Items
        </h3>
      </div>
      <div className="space-y-2">
        {data.map((invoiceItem) => (
          <div
            key={invoiceItem.id}
            className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() =>{
              toggleResults(false)
              navigate("/sales/update-invoice", {
                state: {
                  invoice_id: invoiceItem.sales_invoice,
                },
                replace: true,
              })}
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">
                  {invoiceItem.product.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  invoice ID: {invoiceItem.sales_invoice}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-foreground">
                  x {invoiceItem.quantity}
                </p>
                <p className="text-xs text-muted-foreground">
                  PKR {invoiceItem.quantity * invoiceItem.unit_price}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchPurchaseInvoices({ data, toggleResults }) {
  const invoices = data.map(transformPurchaseInvoice);
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Package className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">
          Purchase Invoices
        </h3>
      </div>
      <div className="space-y-2">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() =>{
              toggleResults(false)
              navigate("/purchases/update-invoice", {
                state: {
                  invoice_id: invoice.id,
                },
                replace: true,
              })}
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">
                  Invoice ID: {invoice.id} | {invoice.invoice_no}
                </p>
                <p className="text-xs text-muted-foreground">
                  {invoice.supplier}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-foreground">
                  {invoice.total}
                </p>
                <p className="text-xs text-muted-foreground">
                  Received at: {invoice.delivery}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchPurchaseInvoiceItems({ data, toggleResults }) {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Package className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">
          Purchases Invoice Items
        </h3>
      </div>
      <div className="space-y-2">
        {data.map((invoiceItem) => (
          <div
            key={invoiceItem.id}
            className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() =>{
              toggleResults(false)
              navigate("/purchases/update-invoice", {
                state: {
                  invoice_id: invoiceItem.purchase_invoice,
                },
                replace: true,
              })}
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">
                  {invoiceItem.product.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  invoice ID: {invoiceItem.purchase_invoice}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-foreground">
                  x {invoiceItem.quantity}
                </p>
                <p className="text-xs text-muted-foreground">
                  PKR {invoiceItem.quantity * invoiceItem.unit_cost}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchProducts({ data, toggleResults }) {
  const products = data.map(transformProduct)
  const navigate = useNavigate()

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <PackageOpen className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Products</h3>
      </div>
      <div className="space-y-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() =>{
              toggleResults(false)
              navigate("/products/update-product", {
                state: {
                  product_id: product.id,
                },
                replace: true,
              })
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">
                  {product.name}
                </p>
                <p className="text-xs text-muted-foreground">{product.unit}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchCustomers({ data, toggleResults }) {
  const customers = data.map(transformCustomer)
  const navigate = useNavigate()

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Customers</h3>
      </div>
      <div className="space-y-2">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() =>{
              toggleResults(false)
              navigate("/customers/view-customer", {
                state: {
                  customer_id: customer.id,
                },
                replace: true,
              })
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">
                  {customer.name}
                </p>
                <p className="text-xs text-muted-foreground">{customer.city}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-foreground">
                  {customer.phone}
                </p>
                <p className="text-xs text-muted-foreground">
                  {customer.email}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchReturnedItems({ data, toggleResults }) {
  const returnedItems = data.map(transformReturnedItem)
  const navigate = useNavigate()

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Undo2 className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Returned Items</h3>
      </div>
      <div className="space-y-2">
        {returnedItems.map((returnedItem) => (
          <div
            key={returnedItem.id}
            className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() =>{
              toggleResults(false)
              navigate("/returned-items/update-returned-item", {
                state: {
                  returned_item_id: returnedItem.id,
                },
                replace: true,
              })
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">
                  {returnedItem.product}
                </p>
                <p className="text-xs text-muted-foreground">Sales Invoice ID: {returnedItem.sales_invoice}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-foreground">
                  x {returnedItem.quantity}
                </p>
                <p className="text-xs text-muted-foreground">
                  Returned At: {returnedItem.returned_at}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchSuppliers({ data, toggleResults }) {
  const suppliers = data
  const navigate = useNavigate()

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Truck className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Suppliers</h3>
      </div>
      <div className="space-y-2">
        {suppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() =>{
              toggleResults(false)
              navigate("/suppliers/view-supplier", {
                state: {
                  supplier_id: supplier.id,
                },
                replace: true,
              })
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">
                  {supplier.name}
                </p>
                <p className="text-xs text-muted-foreground">{supplier.business_name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-foreground">
                  {supplier.phone}
                </p>
                <p className="text-xs text-muted-foreground">
                  {supplier.email}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchLocations({ data, toggleResults }) {
  const locations = data
  const navigate = useNavigate()

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Locations</h3>
      </div>
      <div className="space-y-2">
        {locations.map((location) => (
          <div
            key={location.id}
            className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() =>{
              toggleResults(false)
              navigate("/locations/update-location", {
                state: {
                  location_id: location.id,
                },
                replace: true,
              })
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">
                  {location.name}
                </p>
                <p className="text-xs text-muted-foreground">{location.address}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchExpenses({ data, toggleResults }) {
  const expenses = data
  const navigate = useNavigate()

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Wallet2 className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Expenses</h3>
      </div>
      <div className="space-y-2">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() =>{
              toggleResults(false)
              navigate("/expenses/update-expense", {
                state: {
                  expense_id: expense.id,
                },
                replace: true,
              })
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">
                  {expense.name}
                </p>
                <p className="text-xs text-muted-foreground">{expense.desc}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-foreground">
                  PKR {expense.amount}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



function SearchItemsProvider({ result, toggleResults }) {
  if (result.count == 0) {
    return;
  }

  switch (result.model) {
    case "SalesInvoice":
      return (
        <div>
          <SearchSalesInvoices data={result.results} toggleResults={toggleResults}/>
          <Separator className="my-4" />
        </div>
      );

    case "SalesInvoiceItem":
      return (
        <div>
          <SearchSalesInvoiceItems data={result.results} toggleResults={toggleResults} />
          <Separator className="my-4" />
        </div>
      );

    case "PurchaseInvoice":
      return (
        <div>
          <SearchPurchaseInvoices data={result.results} toggleResults={toggleResults} />
          <Separator className="my-4" />
        </div>
      );

    case "PurchaseInvoiceItem":
      return (
        <div>
          <SearchPurchaseInvoiceItems data={result.results} toggleResults={toggleResults} />
          <Separator className="my-4" />
        </div>
      );

    case "Customer":
      return (
        <div>
          <SearchCustomers data={result.results} toggleResults={toggleResults} />
          <Separator className="my-4" />
        </div>
      );
    
    case "Product":
      return (
        <div>
          <SearchProducts data={result.results} toggleResults={toggleResults} />
          <Separator className="my-4" />
        </div>
      );

    case "ReturnedItem":
      return (
        <div>
          <SearchReturnedItems data={result.results} toggleResults={toggleResults} />
          <Separator className="my-4"/>
        </div>
    )

    case "Supplier":
      return (
        <div>
          <SearchSuppliers data={result.results} toggleResults={toggleResults} />
          <Separator className="my-4"/>
        </div>
    )

    case "Location":
      return (
        <div>
          <SearchLocations data={result.results} toggleResults={toggleResults} />
          <Separator className="my-4"/>
        </div>
    )

    case "Expense":
      return (
        <div>
          <SearchExpenses data={result.results} toggleResults={toggleResults} />
          <Separator className="my-4"/>
        </div>
    )
    default:
      break;
  }
}

export default SearchItemsProvider;
