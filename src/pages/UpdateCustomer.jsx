import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
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
import { ChartNoAxesColumnDecreasing, Plus, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { createIdMap } from "../../services/utils";
import { getCitiesList, getCustomerDetail, updateCustomer } from "../../services/api";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";

const UpdateCustomer = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cities, setCities] = useState([]);
  const token = localStorage.getItem("market-pro-access-token");
  const navigate = useNavigate();
  const location = useLocation();
  const customer_id = location.state?.customer_id || null;

  // react-hook-form setup
  const { register, handleSubmit, control, watch, reset, setValue } = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      city: "",
      address: "",
      notes: "",
    },
  });

  const onCustomerUpdate = async (data) => {
    console.log(data);

    try {
      const success = await updateCustomer(token, customer_id, data);

      if (success) {
        toast.success("Customer updated successfully!");
        navigate("/customers");
      } else {
        toast.error("Failed to update customer.");
      }
    } catch (error) {
      console.log("Error creating customer:", error);
    }
  };

  const populateCustomerFields = (data) => {
    reset({
      name: data.name,
      phone: data.phone || "",
      email: data.email || "",
      city: data.city || "",
      address: data.address || "",
      notes: data.notes || "",
    });
  };

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const cities = await getCitiesList(token);
        if (cities) {
          const citiesMap = createIdMap(cities);
          setCities(citiesMap);
        } else {
          toast.error("Failed to fetch cities");
        }
      } catch (error) {
        console.log("Error fetching cities:", error);
        toast.error("Failed to fetch cities");
      }
    };

    const fetchCustomer = async () => {
      if (!token) return;
      if (!customer_id) return;

      try {
        const customer = await getCustomerDetail(token, customer_id);
        if (customer) {
          populateCustomerFields(customer);
        } else {
          toast.error("Failed to fetch customer.");
          navigate("/customers");
        }
      } catch (error) {
        console.log(error);
        toast.error("Failed to fetch customer.");
        navigate("/customers");
      }
    };

    fetchCities();
    fetchCustomer();
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
          {/* Breadcrumb */}
          <DynamicBreadCrumb />

          <div className="flex items-center justify-between">
            <form
              onSubmit={handleSubmit(onCustomerUpdate)}
              className="flex flex-row w-[48%] gap-12"
            >
              {/* First Column */}
              <div className="flex flex-col flex-wrap flex-1">
                <h2 className="text-lg font-semibold mb-6">Add New Customer</h2>

                <div className="flex gap-6 mb-6">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" type="text" {...register("name")} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="text" {...register("phone")} />
                  </div>
                </div>

                <div className="flex gap-6 mb-6">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="name">Email</Label>
                    <Input id="name" type="text" {...register("email")} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="unit">City</Label>
                    <Controller
                      name="city"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select City"></SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {cities &&
                              Object.keys(cities).length > 0 &&
                              Object.entries(cities).map(([key, city]) => (
                                <SelectItem value={key} key={key}>
                                  {city.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="mb-6 space-y-1">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    {...register("address")}
                    placeholder="Enter address here"
                    rows={4}
                  />
                </div>

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
                  <Button type="submit">Update Customer</Button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UpdateCustomer;
