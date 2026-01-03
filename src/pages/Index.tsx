import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentSales } from "@/components/dashboard/RecentSales";
import { useEffect, useState } from "react";
import { useAuth } from '../../services/AuthProvider'
import { getRecentSales } from '../../services/api'
import { getTotalInventoryValue } from '../../services/api'
import { getTotalSalesDaily } from '../../services/api'
import { getAvgOrderValue } from '../../services/api'
import { getTotalPurchases } from '../../services/api'
import { getMonthlySalesTrend } from '../../services/api'
import { toast } from "react-toastify";

// Sample data for charts

const inventoryData = [
  { name: "1", value: 100 },
  { name: "2", value: 90 },
  { name: "3", value: 85 },
  { name: "4", value: 75 },
  { name: "5", value: 65 },
  { name: "6", value: 50 },
  { name: "7", value: 40 },
]

const Index = () => {
  const { token } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [recentSales, SetRecentSales] = useState([])
  const [totalInventoryValue, SetTotalInventoryValue] = useState([])
  const [totalSalesDaily, setTotalSalesDaily] = useState([])
  const [avgOrderValue, setAvgOrderValue] = useState([])
  const [totalPurchases, setTotalPurchases] = useState([])
  const [monthlySalesTrend, setMonthlySalesTrend] = useState([])
  const { user } = useAuth()

  useEffect(() => {

    const fetchRecentSales = async () => {
      try {
        const res = await getRecentSales(token)
        if (!res) {
          toast.error("Error fetching recent sales")
          return
        }

        SetRecentSales(res)
      } catch (error) {
        console.log(error)
        toast.error("Error fetching recent sales")
      }
    }

    const fetchTotalInventoryValue = async () => {
      try {
        const res = await getTotalInventoryValue(token)
        if (!res) {
          toast.error("Error fetching recent sales")
          return
        }

        SetTotalInventoryValue(res)
      } catch (error) {
        console.log(error)
        toast.error("Error fetching recent sales")
      }
    }

    const fetchTotalSalesDaily = async () => {
      try {
        const res = await getTotalSalesDaily(token)
        if (res == null) {
          toast.error("Error fetching recent sales")
          return
        }

        setTotalSalesDaily(res)
      } catch (error) {
        console.log(error)
        toast.error("Error fetching total sales")
      }
    }

    const fetchAvgOrderValue = async () => {
      try {
        const res = await getAvgOrderValue(token)
        if (res == null) {
          toast.error("Error fetching recent sales")
          return
        }

        setAvgOrderValue(res)
      } catch (error) {
        console.log(error)
        toast.error("Error fetching total sales")
      }
    }

    const fetchTotalPurchases = async () => {
      try {
        const res = await getTotalPurchases(token)
        if (res == null) {
          toast.error("Error fetching recent sales")
          return
        }

        setTotalPurchases(res)
      } catch (error) {
        console.log(error)
        toast.error("Error fetching total sales")
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
      }
    }

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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="grid grid-2 gap-6">
            <ChartCard
              title="Total Sales this month"
              data={monthlySalesTrend}
              color="#8b5cf6"
            />

            <ChartCard
              title="Inventory Value in July"
              data={inventoryData}
              color="#ef4444"
            />
          </div>

          <div className="grid grid-2 gap-6">
            <ChartCard
              title="Inventory Value in July"
              data={inventoryData}
              color="#ef4444"
            />

            <ChartCard
              title="Inventory Value in July"
              data={inventoryData}
              color="#ef4444"
            />
          </div>

          <QuickActions />

        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Metrics Cards Column */}
          <div className="grid grid-cols-1 gap-4">
            <MetricCard title="Net Inventory Value" value={`PKR ${totalInventoryValue}`} />
            <MetricCard title="Total Sales Today" value={`PKR ${totalSalesDaily}`} />
            <MetricCard title="Average Order Value" value={`PKR ${avgOrderValue}`} />
            <MetricCard title="Total Purchases" value={`PKR ${totalPurchases}`} />
          </div>

          <RecentSales recentSales={recentSales} />
        </div>
      </main>
    </div>
  </div>
);
}

export default Index;
