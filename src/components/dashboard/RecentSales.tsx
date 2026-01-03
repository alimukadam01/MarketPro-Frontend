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

export function RecentSales( { recentSales } ) {

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
            {recentSales.map((sale, index) => (
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
            ))}
          </TableBody>
        
        </Table>
      </CardContent>
    </Card>
  );
}