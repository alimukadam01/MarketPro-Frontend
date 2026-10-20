import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PeriodMetricCard } from "@/components/dashboard/PeriodMetricCard";
import { PeriodChartCard } from "@/components/dashboard/PeriodChartCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentSales } from "@/components/dashboard/RecentSales";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../services/AuthProvider'
import {
  getRecentSales,
  getTotalInventoryValue,
  getSalesSummary,
  getPurchasesSummary,
  getSalesTrend,
  getExpensesTrend,
} from '../../services/api'
import { toast } from "react-toastify";
import { formatCurrency } from "../../services/utils";
import { withPeriod } from "../../services/periods";

const Index = () => {
  const { token } = useAuth()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [recentSales, SetRecentSales] = useState(null)
  const [totalInventoryValue, SetTotalInventoryValue] = useState(null)

  // One flag per figure, not one for the page: these are independent
  // requests, and a single flag would hold every card back for the slowest.
  // The period cards below load themselves.
  const [loading, setLoading] = useState({ recentSales: true, inventory: true })
  const done = (key) => setLoading((prev) => ({ ...prev, [key]: false }))

  useEffect(() => {

    if (!token){
      navigate("/login")
    }

    const fetchRecentSales = async () => {
      try {
        const res = await getRecentSales(token)
        if (!res) {
          console.log("recent sales:", res)
          toast.error("Error fetching recent sales")
          return
        }

        SetRecentSales(res)
      } catch (error) {
        console.log(error)
        toast.error("Error fetching recent sales")
      } finally {
        done("recentSales")
      }
    }

    const fetchTotalInventoryValue = async () => {
      try {
        const res = await getTotalInventoryValue(token)
        if (res == null) {
          console.log("total inventory value:", res)
          toast.error("Error fetching total inventory value")
          return
        }

        SetTotalInventoryValue(res)
      } catch (error) {
        console.log(error)
        toast.error("Error fetching total inventory value")
      } finally {
        done("inventory")
      }
    }

    fetchTotalInventoryValue()
    fetchRecentSales()

  }, [token])

  // Each period card asks for its own period, so these take one.
  const salesFor = (period) => getSalesSummary(token, withPeriod("", period))
  const purchasesFor = (period) => getPurchasesSummary(token, withPeriod("", period))

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />

      <div className={`${sidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300 flex flex-col`}>
        <Header />

        <main className="flex-1 p-6 space-y-6">
          {/* Breadcrumb and Greeting */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="text-primary cursor-pointer">home</span> /
            </p>
            <div>
              <h1 className="text-2xl font-bold">Hello, {user && user.first_name}!</h1>
              <p className="text-muted-foreground">let's get on with the business today</p>
            </div>
          </div>

          {/* Charts and Metrics Section. The charts take three quarters of the
              row and Quick Actions the last one. minmax(0, …) tracks, so a
              chart that measures wider than its share cannot drag the column
              with it and paint over Quick Actions. */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-6">
            <div className="grid grid-cols-1 gap-6 min-w-0">
              <PeriodChartCard
                title="Total Sales"
                storageKey="dashboard-sales-trend"
                defaultPeriod={{ key: "month" }}
                fetcher={(period) => getSalesTrend(token, period)}
                color="#00a000"
                errorMessage="Error fetching the sales trend"
              />
              <PeriodChartCard
                title="Total Expenses"
                storageKey="dashboard-expenses-trend"
                defaultPeriod={{ key: "month" }}
                fetcher={(period) => getExpensesTrend(token, period)}
                color="red"
                errorMessage="Error fetching the expenses trend"
              />
            </div>

            <QuickActions />

          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metrics Cards Column. Each card keeps its own period; Net
                Inventory Value is a balance, so it has none. */}
            <div className="grid grid-cols-1 gap-4 content-start">
              <MetricCard
                title="Net Inventory Value"
                value={formatCurrency(totalInventoryValue)}
                hint="As of today"
                loading={loading.inventory}
              />
              <PeriodMetricCard
                title="Sales Invoiced"
                storageKey="dashboard-sales-invoiced"
                defaultPeriod={{ key: "today" }}
                fetcher={salesFor}
                pick={(data: { sales_invoiced: number }) => formatCurrency(data.sales_invoiced)}
                errorMessage="Error fetching sales invoiced"
              />
              <PeriodMetricCard
                title="Payments Received"
                storageKey="dashboard-payments-received"
                defaultPeriod={{ key: "today" }}
                fetcher={salesFor}
                pick={(data: { payments_received: number }) => formatCurrency(data.payments_received)}
                errorMessage="Error fetching payments received"
              />
              <PeriodMetricCard
                title="Average Order Value"
                storageKey="dashboard-average-order-value"
                defaultPeriod={{ key: "month" }}
                fetcher={salesFor}
                pick={(data: { average_order_value: number }) => formatCurrency(data.average_order_value)}
                errorMessage="Error fetching the average order value"
              />
              <PeriodMetricCard
                title="Purchases Invoiced"
                storageKey="dashboard-purchases-invoiced"
                defaultPeriod={{ key: "month" }}
                fetcher={purchasesFor}
                pick={(data: { purchases_invoiced: number }) => formatCurrency(data.purchases_invoiced)}
                errorMessage="Error fetching purchases invoiced"
              />
            </div>

            <RecentSales recentSales={recentSales} loading={loading.recentSales} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Index;
