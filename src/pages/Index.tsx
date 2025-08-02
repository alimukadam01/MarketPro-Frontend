import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentSales } from "@/components/dashboard/RecentSales";

// Sample data for charts
const salesData = [
  { name: "1", value: 20 },
  { name: "2", value: 30 },
  { name: "3", value: 25 },
  { name: "4", value: 45 },
  { name: "5", value: 60 },
  { name: "6", value: 80 },
  { name: "7", value: 95 },
];

const inventoryData = [
  { name: "1", value: 100 },
  { name: "2", value: 90 },
  { name: "3", value: 85 },
  { name: "4", value: 75 },
  { name: "5", value: 65 },
  { name: "6", value: 50 },
  { name: "7", value: 40 },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 space-y-6">
          {/* Breadcrumb and Greeting */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="text-primary cursor-pointer">home</span> /
            </p>
            <div>
              <h1 className="text-2xl font-bold">Hello, Mr. Mukadam!</h1>
              <p className="text-muted-foreground">let's get on with the business today</p>
            </div>
          </div>

          {/* Charts and Metrics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
            {/* Charts */}
            <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard 
                title="Total Sales in July" 
                data={salesData}
                color="#8b5cf6"
              />
              <ChartCard 
                title="Inventory Value in July" 
                data={inventoryData}
                color="#ef4444"
              />
            </div>
            
            {/* Metrics Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 gap-4">
              <MetricCard title="Net Inventory Value" value="PKR 789,245" />
              <MetricCard title="Total Sales Today" value="PKR 120,250" />
              <MetricCard title="Average Order Value" value="PKR 5,600" />
              <MetricCard title="Total Purchases" value="PKR 250,000" />
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuickActions />
            <RecentSales />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
