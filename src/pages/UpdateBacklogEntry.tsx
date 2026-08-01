import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  backlogEntriesAPIPackage,
  updateBacklogEntry,
  getEmployeesList,
} from "../../services/api";
import { useAuth } from "../../services/AuthProvider";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { createIdMap, getImageUrl } from "../../services/utils";

const UpdateBacklogEntry = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [employees, setEmployees] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const entry_id = location.state?.entry_id || null;
  const businessId = localStorage.getItem("mp-business-id");

  const { handleSubmit, control, register, reset } = useForm({
    defaultValues: {
      type: "",
      assigned_to: "",
      notes: "",
      is_done: false,
    },
  });

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("type", data.type);
      if (imageFile) formData.append("image", imageFile);
      if (data.assigned_to) formData.append("assigned_to", data.assigned_to);
      if (data.notes) formData.append("notes", data.notes);
      formData.append("is_done", data.is_done ? "true" : "false");

      const success = await updateBacklogEntry(token, entry_id, formData);
      if (success) {
        toast.success("Backlog entry updated successfully!");
        navigate("/backlog");
      } else {
        toast.error("Failed to update backlog entry.");
      }
    } catch (error) {
      console.log("Error updating backlog entry:", error);
      toast.error("Failed to update backlog entry.");
    }
  };

  useEffect(() => {
    const fetchEntry = async () => {
      if (!token || !entry_id) return;
      try {
        const entry = await backlogEntriesAPIPackage.detail(token, entry_id);
        if (entry) {
          setExistingImageUrl(getImageUrl(entry.image) || null);
          reset({
            type: entry.type || "",
            assigned_to: entry.assigned_to
              ? String(entry.assigned_to.id)
              : "",
            notes: entry.notes || "",
            is_done: entry.is_done || false,
          });
        } else {
          toast.error("Failed to fetch backlog entry.");
          navigate("/backlog");
        }
      } catch (error) {
        console.log(error);
        toast.error("Failed to fetch backlog entry.");
        navigate("/backlog");
      }
    };

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

    fetchEntry();
    fetchEmployees();
  }, [token, entry_id]);

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
                Update Backlog Entry
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

              {/* Image — preview + optional replacement */}
              <div className="flex-1 space-y-2 mb-6">
                <Label htmlFor="image">Image</Label>
                {existingImageUrl && !imageFile && (
                  <a
                    href={existingImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={existingImageUrl}
                      alt="current backlog"
                      className="w-24 h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                    />
                  </a>
                )}
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setImageFile(e.target.files?.[0] || null)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep the existing image.
                </p>
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
                        <SelectValue placeholder="Select employee" />
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

              {/* Is Done */}
              <div className="flex items-center space-x-3 mb-6">
                <Controller
                  name="is_done"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      id="is_done"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  )}
                />
                <Label htmlFor="is_done" className="cursor-pointer">
                  Mark as Done
                </Label>
              </div>

              <div className="flex justify-end gap-3 mt-auto">
                <Button type="submit">Update Entry</Button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default UpdateBacklogEntry;
