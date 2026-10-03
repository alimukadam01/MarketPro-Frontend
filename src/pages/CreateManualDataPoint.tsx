import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { useAuth } from "../../services/AuthProvider";
import { manualDataPointsAPIPackage } from "../../services/api";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePending } from "@/hooks/use-pending";

const CreateManualDataPoint = () => {
  const { pending, run } = usePending();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      value: "",
      value_type: "amount",
      as_of_date: "",
      notes: "",
    },
  });

  const onCreate = async (data) => {
    try {
      const created = await manualDataPointsAPIPackage.create(token, {
        name: data.name,
        value: Number(data.value),
        value_type: data.value_type,
        as_of_date: data.as_of_date || null,
        notes: data.notes || null,
      });

      if (created) {
        toast.success("Data point recorded successfully!");
        navigate("/targets");
      } else {
        toast.error("Failed to record data point.");
      }
    } catch (error) {
      console.log("Error recording data point:", error);
      toast.error("Failed to record data point.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div
        className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col h-screen`}
      >
        <Header />

        <main className="flex-1 flex flex-col p-6 gap-6">
          <DynamicBreadCrumb />

          <div className="bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground">
              A figure you type in yourself, to sit beside the one MarketPro
              works out. Useful for recording what an outside party claims, so
              the two can be compared. It is shown for reference only and is
              never used to measure a target.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(run(onCreate))}
            className="flex flex-row w-[48%] gap-12"
          >
            <div className="flex flex-col flex-1">
              <h2 className="text-lg font-semibold mb-6">
                Record a Data Point
              </h2>

              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g. Supplier statement for Q3"
                    {...register("name", { required: "A name is required" })}
                  />
                  {errors.name && (
                    <span className="text-red-500 text-sm">
                      {errors.name.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="value">
                    Value <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    {...register("value", { required: "A value is required" })}
                  />
                  {errors.value && (
                    <span className="text-red-500 text-sm">
                      {errors.value.message}
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <Label htmlFor="value_type">Kind</Label>
                  <Controller
                    name="value_type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a kind"></SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">Amount (PKR)</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="as_of_date">Accurate as of</Label>
                  <Input
                    id="as_of_date"
                    type="date"
                    {...register("as_of_date")}
                  />
                </div>
              </div>

              <div className="flex flex-col flex-1 mb-6 space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  className="flex-1"
                  placeholder="Where this figure came from..."
                  {...register("notes")}
                />
              </div>

              <div className="flex justify-end mt-auto">
                <SubmitButton type="submit" pending={pending} pendingLabel="Creating…">Record Data Point</SubmitButton>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default CreateManualDataPoint;
