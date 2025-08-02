import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const recentSales = [
  { item: "1/2 inch nut bolts x 350", amount: "3500" },
  { item: "20 Pressure Blowers x 350", amount: "200000" },
  { item: "1/2 inch nut bolts x 350", amount: "3500" },
  { item: "6 WD40 x 350", amount: "2100" },
  { item: "1/2 inch nut bolts x 350", amount: "3500" },
  { item: "1/2 inch nut bolts x 350", amount: "3500" },
];

export function RecentSales() {
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
              <TableRow key={index}>
                <TableCell className="font-medium">{sale.item}</TableCell>
                <TableCell className="text-right">{sale.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}