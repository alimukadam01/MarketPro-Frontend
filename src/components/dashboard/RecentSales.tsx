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

export function RecentSales({ recentSales, loading = false }) {

  const navigate = useNavigate()

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
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
            {loading || !recentSales ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="flex justify-end"><Skeleton className="h-4 w-20" /></TableCell>
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