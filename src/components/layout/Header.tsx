import { Search, User, FileText, ShoppingCart, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function Header() {
  const [searchValue, setSearchValue] = useState("");

  // Mock search results template
  const mockResults = {
    salesInvoices: [
      { id: "SI-001", customer: "John Doe", amount: "$1,234.56", date: "2024-01-15" },
      { id: "SI-002", customer: "Jane Smith", amount: "$2,456.78", date: "2024-01-14" },
    ],
    purchaseInvoices: [
      { id: "PI-001", supplier: "ABC Corp", amount: "$3,456.78", date: "2024-01-13" },
      { id: "PI-002", supplier: "XYZ Ltd", amount: "$1,234.56", date: "2024-01-12" },
    ],
    products: [
      { id: "PROD-001", name: "Wireless Mouse", category: "Electronics", stock: 45 },
      { id: "PROD-002", name: "Office Chair", category: "Furniture", stock: 12 },
    ],
  };

  return (
    <header className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for sales invoices, purchase invoices or anything else!"
              className="pl-9"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          {/* Search Results Container */}
          {searchValue.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[500px] overflow-hidden">
              <ScrollArea className="h-full max-h-[500px]">
                <div className="p-4">
                  {/* Sales Invoices Section */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm text-foreground">Sales Invoices</h3>
                    </div>
                    <div className="space-y-2">
                      {mockResults.salesInvoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm text-foreground">{invoice.id}</p>
                              <p className="text-xs text-muted-foreground">{invoice.customer}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm text-foreground">{invoice.amount}</p>
                              <p className="text-xs text-muted-foreground">{invoice.date}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Purchase Invoices Section */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm text-foreground">Purchase Invoices</h3>
                    </div>
                    <div className="space-y-2">
                      {mockResults.purchaseInvoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm text-foreground">{invoice.id}</p>
                              <p className="text-xs text-muted-foreground">{invoice.supplier}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm text-foreground">{invoice.amount}</p>
                              <p className="text-xs text-muted-foreground">{invoice.date}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Products Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm text-foreground">Products</h3>
                    </div>
                    <div className="space-y-2">
                      {mockResults.products.map((product) => (
                        <div
                          key={product.id}
                          className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm text-foreground">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Stock: {product.stock}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarFallback>AM</AvatarFallback>
            </Avatar>
            <span className="font-medium">Ali Mukadam</span>
          </div>
        </div>
      </div>
    </header>
  );
}