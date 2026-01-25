import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { expensesAPIPackage } from "../../services/api";
import { useAuth } from "../../services/AuthProvider"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";

const UpdateExpense = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const expense_id = location.state?.expense_id || null

    // react-hook-form setup
    const { register, handleSubmit, control, watch, reset, setValue } = useForm({
        defaultValues: {
            name: "",
            address: "",
        },
    });

    const onExpenseUpdate = async (data) => {

        try {
            const success = await expensesAPIPackage.update(token, expense_id, data);

            if (success) {
                toast.success("Expense updated successfully!");
                navigate("/expenses");
            } else {
                toast.error("Failed to update expense.");
            }
        } catch (error) {
            console.log("Error updating expense:", error);
        }
    };

    const populateExpenseFields = (data) => {
    reset({
      name: data.name,
      desc: data.desc || "",
      amount: data.amount || 0
    });
  };

    useEffect(() => {

        const fetchExpense = async () => {
          if (!token) return;
          if (!expense_id) return;
    
          try {
            const expense = await expensesAPIPackage.detail(token, expense_id);
            if (expense) {
              populateExpenseFields(expense);
            } else {
              toast.error("Failed to fetch expense.");
              navigate("/expenses");
            }
          } catch (error) {
            console.log(error);
            toast.error("Failed to fetch expense.");
            navigate("/expenses");
          }
        };
    
        fetchExpense();
      }, [token, expense_id]);


    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div
                className={`${sidebarCollapsed ? "ml-16" : "ml-64"
                    } transition-all duration-300 flex flex-col`}
            >
                <Header />

                <main className="flex-1 p-6 space-y-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <div className="flex items-center justify-between">
                        <form
                            onSubmit={handleSubmit(onExpenseUpdate)}
                            className="flex flex-row w-[48%] gap-12"
                        >
                            {/* First Column */}
                            <div className="flex flex-col flex-wrap flex-1">
                                <h2 className="text-lg font-semibold mb-6">Add New Expense</h2>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="name">Name</Label>
                                        <Input id="name" type="text" {...register("name")} />
                                    </div>
                                </div>

                                <div className="mb-6 space-y-1">
                                    <Label htmlFor="desc">Description</Label>
                                    <Textarea
                                        id="desc"
                                        {...register("desc")}
                                        placeholder="Enter desc here"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="desc">Description</Label>
                                        <Input id="desc" type="text" {...register("desc")} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-auto">
                                    <Button type="submit">Update Expense</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default UpdateExpense;
