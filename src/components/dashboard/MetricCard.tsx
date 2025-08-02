import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string;
  className?: string;
}

export function MetricCard({ title, value, className }: MetricCardProps) {
  return (
    <Card className={`shadow-sm ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}