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
import { locationsAPIPackage } from "../../services/api";
import { useAuth } from "../../services/AuthProvider"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";

const UpdateLocation = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const { token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const location_id = location.state?.location_id || null

    // react-hook-form setup
    const { register, handleSubmit, control, watch, reset, setValue } = useForm({
        defaultValues: {
            name: "",
            address: "",
        },
    });

    const onLocationUpdate = async (data) => {

        try {
            const success = await locationsAPIPackage.update(token, location_id, data);

            if (success) {
                toast.success("Location updated successfully!");
                navigate("/locations");
            } else {
                toast.error("Failed to update location.");
            }
        } catch (error) {
            console.log("Error updating location:", error);
        }
    };

    const populateLocationFields = (data) => {
    reset({
      name: data.name,
      address: data.address || "",
    });
  };

    useEffect(() => {

        const fetchLocation = async () => {
          if (!token) return;
          if (!location_id) return;
    
          try {
            const location = await locationsAPIPackage.detail(token, location_id);
            if (location) {
              populateLocationFields(location);
            } else {
              toast.error("Failed to fetch location.");
              navigate("/locations");
            }
          } catch (error) {
            console.log(error);
            toast.error("Failed to fetch location.");
            navigate("/locations");
          }
        };
    
        fetchLocation();
      }, [token, location_id]);


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
                            onSubmit={handleSubmit(onLocationUpdate)}
                            className="flex flex-row w-[48%] gap-12"
                        >
                            {/* First Column */}
                            <div className="flex flex-col flex-wrap flex-1">
                                <h2 className="text-lg font-semibold mb-6">Add New Location</h2>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="name">Name</Label>
                                        <Input id="name" type="text" {...register("name")} />
                                    </div>
                                </div>

                                <div className="mb-6 space-y-1">
                                    <Label htmlFor="address">Address</Label>
                                    <Textarea
                                        id="address"
                                        {...register("address")}
                                        placeholder="Enter address here"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-auto">
                                    <Button type="submit">Update Location</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default UpdateLocation;
