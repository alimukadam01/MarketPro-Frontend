import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { TriangleAlert } from "lucide-react";

export function RecentSales({ recentSales, loading = false }) {

  const navigate = useNavigate()
  // Settled with nothing: the fetch failed. It used to shimmer for ever.
  const failed = !loading && !recentSales

  return (
    <Card className="shadow-sm">
      <CardHeader>
        {/* The dashboard's one heading size, shared with its cards and charts. */}
        <CardTitle className="flex items-center gap-2 text-xl leading-8 tracking-normal">
          Recent Sales
          {failed && (
            <span
              role="img"
              aria-label="Couldn't load Recent Sales"
              title="Couldn't load Recent Sales. Refresh the page to try again."
              className="inline-flex shrink-0"
            >
              <TriangleAlert className="h-[18px] w-[18px] text-red-600" strokeWidth={2.25} />
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
        
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {failed ? (
              <TableRow>
                <TableCell colSpan={2} className="text-sm text-muted-foreground">
                  Couldn't load recent sales.
                </TableCell>
              </TableRow>
            ) : loading ? (
              // One placeholder per row, spanning the row, rather than a bar
              // per cell - the row is the unit the reader is waiting on.
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell colSpan={2} className="py-2">
                    <Skeleton className="h-6 w-full rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : recentSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-sm text-muted-foreground">
                  No sales recorded yet.
                </TableCell>
              </TableRow>
            ) : (
            recentSales.map((sale, index) => (
              <TableRow key={index} style = {{cursor: "pointer",}} onClick={()=>navigate(
                  'sales/update-invoice', {
                    state: {
                      invoice_id: sale.id
                    }
                  }
                )}>
                <TableCell className="font-medium">{sale.product} x {sale.quantity}</TableCell>
                <TableCell className="text-right">PKR {sale.quantity * sale.price}</TableCell>
              </TableRow>
            )))}
          </TableBody>
        
        </Table>
      </CardContent>
    </Card>
  );
}