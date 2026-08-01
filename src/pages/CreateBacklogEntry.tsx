import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBacklogEntry, getEmployeesList } from "../../services/api";
import { useAuth } from "../../services/AuthProvider";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { createIdMap } from "../../services/utils";

const CreateBacklogEntry = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [employees, setEmployees] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();
  const businessId = localStorage.getItem("mp-business-id");

  const { handleSubmit, control, register } = useForm({
    defaultValues: {
      type: "",
      assigned_to: "",
      notes: "",
    },
  });

  const onSubmit = async (data) => {
    if (!imageFile) {
      toast.error("Please select an image.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("type", data.type);
      formData.append("image", imageFile);
      if (data.assigned_to) formData.append("assigned_to", data.assigned_to);
      if (data.notes) formData.append("notes", data.notes);

      const success = await createBacklogEntry(token, formData);
      if (success) {
        toast.success("Backlog entry created successfully!");
        navigate("/backlog");
      } else {
        toast.error("Failed to create backlog entry.");
      }
    } catch (error) {
      console.log("Error creating backlog entry:", error);
      toast.error("Failed to create backlog entry.");
    }
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!businessId) return;
      try {
        const res = await getEmployeesList(token, businessId);
        if (res) {
          setEmployees(createIdMap(res));
        } else {
          toast.error("Failed to fetch employees.");
        }
      } catch (error) {
        console.log("Error fetching employees:", error);
        toast.error("Failed to fetch employees.");
      }
    };
    fetchEmployees();
  }, [token]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div
        className={`${
          sidebarCollapsed ? "ml-16" : "ml-64"
        } transition-all duration-300 flex flex-col`}
      >
        <Header />

        <main className="flex-1 p-6 space-y-6">
          <DynamicBreadCrumb />

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-row w-[48%] gap-12"
          >
            <div className="flex flex-col flex-1">
              <h2 className="text-lg font-semibold mb-6">
                Add New Backlog Entry
              </h2>

              {/* Type */}
              <div className="flex-1 space-y-1 mb-6">
                <Label>Type</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales_invoice">
                          Sales Invoice
                        </SelectItem>
                        <SelectItem value="purchase_invoice">
                          Purchase Invoice
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Image */}
              <div className="flex-1 space-y-1 mb-6">
                <Label htmlFor="image">Image</Label>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setImageFile(e.target.files?.[0] || null)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
              </div>

              {/* Assigned To */}
              <div className="flex-1 space-y-1 mb-6">
                <Label>Assigned To</Label>
                <Controller
                  name="assigned_to"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(employees).map(([key, emp]: any) => (
                          <SelectItem value={String(key)} key={key}>
                            {emp.user?.first_name} {emp.user?.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Notes */}
              <div className="mb-6 space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Enter notes here"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 mt-auto">
                <Button type="submit">Create Entry</Button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default CreateBacklogEntry;
