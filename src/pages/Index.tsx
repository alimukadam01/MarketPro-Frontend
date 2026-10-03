import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentSales } from "@/components/dashboard/RecentSales";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../services/AuthProvider'
import {
  getRecentSales,
  getTotalInventoryValue, 
  getTotalSalesDaily, 
  getAvgOrderValue, 
  getTotalPurchases, 
  getMonthlySalesTrend,
  getMonthlyExpensesTrend
} from '../../services/api'
import { toast } from "react-toastify";
import { formatCurrency } from "../../services/utils";

// Sample data for charts

const Index = () => {
  const { token } = useAuth()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [recentSales, SetRecentSales] = useState(null)
  const [totalInventoryValue, SetTotalInventoryValue] = useState(null)
  const [totalSalesDaily, setTotalSalesDaily] = useState(null)
  const [avgOrderValue, setAvgOrderValue] = useState(null)
  const [totalPurchases, setTotalPurchases] = useState(null)
  const [monthlySalesTrend, setMonthlySalesTrend] = useState(null)
  const [monthlyExpensesTrend, setMonthlyExpensesTrend] = useState(null)

  // One flag per figure, not one for the page: these are seven independent
  // requests, and a single flag would hold every card back for the slowest.
  const [loading, setLoading] = useState({
    recentSales: true, inventory: true, salesDaily: true,
    avgOrder: true, purchases: true, salesTrend: true, expensesTrend: true,
  })
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
        toast.error("Error fetching recent sales")
      } finally {
        done("inventory")
      }
    }

    const fetchTotalSalesDaily = async () => {
      try {
        const res = await getTotalSalesDaily(token)
        if (res == null) {
          console.log("total sales daily:", res)
          toast.error("Error fetching daily total sales")
          return
        }

        setTotalSalesDaily(res)
      } catch (error) {
        console.log(error)
        toast.error("Error fetching daily total sales")
      } finally {
        done("salesDaily")
      }
    }
    
    const fetchAvgOrderValue = async () => {
      try {
        const res = await getAvgOrderValue(token)
        if (res == null) {
          console.log("Avg. order value: ", res)
          toast.error("Error fetching average order value")
          return
        }

        setAvgOrderValue(res)
      } catch (error) {
        console.log(error)
        toast.error("Error fetching average order value")
      } finally {
        done("avgOrder")
      }
    }
    
    const fetchTotalPurchases = async () => {
      try {
        const res = await getTotalPurchases(token)
        if (res == null) {
          console.log("total purchases: ", res)
          toast.error("Error fetching total purchases")
          return
        }
        
        setTotalPurchases(res)
      } catch (error) {
        console.log(error)
        toast.error("Error fetching total purchases")
      } finally {
        done("purchases")
      }
    }

    const fetchMonthlySales = async () => {
      try {
        const res = await getMonthlySalesTrend(token)
        if (res == null) {
          toast.error("Error fetching monthly sales trend")
          return
        }

        setMonthlySalesTrend(res)
      } catch (error) {
        console.log(error)
        toast.error("Error fetching monthly sales trend")
      } finally {
        done("salesTrend")
      }
    }

    const fetchMonthlyExpenses = async () => {
      try {
        const res = await getMonthlyExpensesTrend(token)
        if (res == null) {
          toast.error("Error fetching monthly sales trend")
          return
        }

        setMonthlyExpensesTrend(res)
      } catch (error) {
        console.log(error)
        toast.error("Error fetching monthly sales trend")
      } finally {
        done("expensesTrend")
      }
    }

    fetchMonthlyExpenses()
    fetchMonthlySales()
    fetchTotalPurchases()
    fetchAvgOrderValue()
    fetchTotalSalesDaily()
    fetchTotalInventoryValue()
    fetchRecentSales()

  }, [token])

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

          {/* Charts and Metrics Section */}
          <div className="grid grid-cols-2 gap-6">
            {/* grid-cols-1 (not the non-existent "grid-2") so this column is a real
                minmax(0,1fr) track. Without it the column is an implicit auto track that
                sizes to its content, so a chart that measures wider than the available
                space drags the column with it and paints over Quick Actions.
                min-w-0 lets the grid item shrink below its content's min-content width. */}
            <div className="grid grid-cols-1 gap-6 min-w-0">
              <ChartCard
                title="Total Sales this month"
                data={monthlySalesTrend}
                color="#00a000"
                loading={loading.salesTrend}
              />
              <ChartCard
                title="Total Expenses this month"
                data={monthlyExpensesTrend}
                color="red"
                loading={loading.expensesTrend}
              />
            </div>

            <QuickActions />

          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metrics Cards Column */}
            <div className="grid grid-cols-1 gap-4">
              <MetricCard title="Net Inventory Value" value={formatCurrency(totalInventoryValue)} loading={loading.inventory} />
              <MetricCard title="Total Sales Today" value={formatCurrency(totalSalesDaily)} loading={loading.salesDaily} />
              <MetricCard title="Average Order Value" value={formatCurrency(avgOrderValue)} loading={loading.avgOrder} />
              <MetricCard title="Total Purchases" value={formatCurrency(totalPurchases)} loading={loading.purchases} />
            </div>

            <RecentSales recentSales={recentSales} loading={loading.recentSales} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Index;
