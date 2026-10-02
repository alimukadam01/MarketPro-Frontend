import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string;
  /** Optional third line, e.g. "as of 1 Aug 2026 · PKR 5,000 left". */
  hint?: string;
  className?: string;
}

export function MetricCard({ title, value, hint, className }: MetricCardProps) {
  return (
    <Card className={`shadow-sm ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}