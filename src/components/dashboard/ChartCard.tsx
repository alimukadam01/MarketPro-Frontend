import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatDate } from "../../../services/utils";

interface ChartCardProps {
  title: string;
  data: { day: string; value: number }[];
  color?: string;
  valueLabel?: string;
}

const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

export function ChartCard({ title, data, color = "#8b5cf6", valueLabel = "Amount" }: ChartCardProps) {
  return (
    // overflow-hidden is the backstop: ResponsiveContainer measures its parent and
    // writes a fixed pixel width onto the chart, so if it ever lags behind a shrinking
    // container the chart must be clipped to the card rather than drawn over whatever
    // sits beside it. min-w-0 lets the card shrink inside a grid/flex parent.
    <Card className="shadow-sm overflow-hidden min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} >
              <XAxis
                dataKey="day"
                tick={false}
                axisLine={false}
                allowDataOverflow={false}
              />
              <YAxis hide />
              {/* The x axis has no visible ticks, so the tooltip is where the
                  date and amount for a point are read. */}
              <Tooltip
                labelFormatter={(day) => formatDate(day)}
                formatter={(value) => [formatCurrency(value), valueLabel]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: "0.875rem",
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                cursor={{ stroke: "hsl(var(--border))" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={true}
                activeDot={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
