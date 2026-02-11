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

// Sample data for charts

const Index = () => {
  const { token } = useAuth()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [recentSales, SetRecentSales] = useState([])
  const [totalInventoryValue, SetTotalInventoryValue] = useState(0)
  const [totalSalesDaily, setTotalSalesDaily] = useState(0)
  const [avgOrderValue, setAvgOrderValue] = useState(0)
  const [totalPurchases, setTotalPurchases] = useState(0)
  const [monthlySalesTrend, setMonthlySalesTrend] = useState(Array(30).fill(0))
  const [monthlyExpensesTrend, setMonthlyExpensesTrend] = useState(Array(30).fill(0))

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
            <div className="grid grid-2 gap-6">
              <ChartCard
                title="Total Sales this month"
                data={monthlySalesTrend}
                color="#00a000"
              />
              <ChartCard
                title="Total Exepenses this month"
                data={monthlyExpensesTrend}
                color="red"
              />
            </div>

            <QuickActions />

          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metrics Cards Column */}
            <div className="grid grid-cols-1 gap-4">
              <MetricCard title="Net Inventory Value" value={`PKR ${totalInventoryValue? totalInventoryValue: 0}`} />
              <MetricCard title="Total Sales Today" value={`PKR ${totalSalesDaily? totalSalesDaily: 0}`} />
              <MetricCard title="Average Order Value" value={`PKR ${avgOrderValue? avgOrderValue: 0}`} />
              <MetricCard title="Total Purchases" value={`PKR ${totalPurchases? totalPurchases: 0}`} />
            </div>

            <RecentSales recentSales={recentSales} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Index;
