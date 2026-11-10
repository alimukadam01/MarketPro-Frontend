import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { PhoneShell } from "@/components/phone/PhoneShell";
import { PhoneSegmented } from "@/components/phone/PhoneSegmented";
import { usePeriodFetch, usePersistentPeriod } from "@/hooks/use-period";
import { useAuth } from "../../../services/AuthProvider";
import {
  getTotalInventoryValue,
  getSalesSummary,
  getPurchasesSummary,
  getSalesTrend,
  getExpensesTrend,
} from "../../../services/api";
import { formatCurrency } from "../../../services/utils";
import { ALL_TIME, CARD_PERIODS, periodHint, withPeriod } from "../../../services/periods";

// The figures come from plain-JS API helpers, so they are untyped here the
// way every other API response in the app is.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Summary = any;

const PERIOD_OPTIONS = CARD_PERIODS.map((p) => ({ value: p.key, label: p.label }));

// The two-up cards: a smaller title and figure than the computer's, so a
// long title or a seven-figure amount fits half a phone's width.
const SMALL_CARD = { className: "p-4", titleClassName: "text-sm leading-5", valueClassName: "text-xl" };

/**
 * The dashboard on a phone (/ via PhoneOr). One period for every figure and
 * chart, where the computer gives each card its own: a row of switches on
 * each card does not fit a phone. Quick Actions and Recent Sales are left
 * out - they lead to pages a phone does not open.
 */
export default function PhoneDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = usePersistentPeriod("phone-dashboard-period", { key: "month" });

  // A balance, not a stretch of time: fetched once, whatever the period.
  const inventory = usePeriodFetch<Summary>(() => getTotalInventoryValue(token), ALL_TIME,
    "Error fetching total inventory value");
  // One sales summary feeds three cards.
  const sales = usePeriodFetch<Summary>((p) => getSalesSummary(token, withPeriod("", p)), period,
    "Error fetching the sales figures");
  const purchases = usePeriodFetch<Summary>((p) => getPurchasesSummary(token, withPeriod("", p)), period,
    "Error fetching purchases invoiced");
  const salesTrend = usePeriodFetch<Summary>((p) => getSalesTrend(token, p), period,
    "Error fetching the sales trend");
  const expensesTrend = usePeriodFetch<Summary>((p) => getExpensesTrend(token, p), period,
    "Error fetching the expenses trend");

  const salesCard = (title: string, field: string) => (
    <MetricCard
      {...SMALL_CARD}
      title={title}
      value={sales.data ? formatCurrency(sales.data[field]) : null}
      loading={sales.loading}
      valueLoading={sales.refreshing}
      error={sales.error}
    />
  );

  return (
    <PhoneShell>
      <div className="flex flex-col gap-0.5">
        <h1 className="text-[22px] font-bold">Hello, {user && user.first_name}!</h1>
        <p className="text-sm text-muted-foreground">Let's get on with the business today</p>
      </div>

      <Button className="h-12 gap-2 text-[15px]" onClick={() => navigate("/backlog/upload")}>
        <Camera className="w-[18px] h-[18px]" />
        Upload Pages
      </Button>

      <div className="flex flex-col gap-1.5">
        <PhoneSegmented
          label="Period"
          options={PERIOD_OPTIONS}
          value={period.key}
          onChange={(key) => setPeriod({ key })}
        />
        <span className="pl-0.5 text-xs text-muted-foreground">{periodHint(sales.data?.period)}</span>
      </div>

      <MetricCard
        className="p-4"
        titleClassName="text-sm leading-5"
        title="Net Inventory Value"
        value={formatCurrency(inventory.data)}
        hint="As of today"
        loading={inventory.loading}
        error={inventory.error}
      />

      <div className="grid grid-cols-2 gap-3">
        {salesCard("Sales Invoiced", "sales_invoiced")}
        {salesCard("Payments Received", "payments_received")}
        <MetricCard
          {...SMALL_CARD}
          title="Purchases Invoiced"
          value={purchases.data ? formatCurrency(purchases.data.purchases_invoiced) : null}
          loading={purchases.loading}
          valueLoading={purchases.refreshing}
          error={purchases.error}
        />
        {salesCard("Average Order Value", "average_order_value")}
      </div>

      <ChartCard
        title="Total Sales"
        data={salesTrend.data ? salesTrend.data.trend : null}
        color="#00a000"
        loading={salesTrend.loading}
        error={salesTrend.error}
        axisLabels
      />
      <ChartCard
        title="Total Expenses"
        data={expensesTrend.data ? expensesTrend.data.trend : null}
        color="red"
        loading={expensesTrend.loading}
        error={expensesTrend.error}
        axisLabels
      />
    </PhoneShell>
  );
}
