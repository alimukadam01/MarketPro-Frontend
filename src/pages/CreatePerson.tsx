import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePending } from "@/hooks/use-pending";
import { useAuth } from "../../services/AuthProvider";
import { createPerson, getCitiesList } from "../../services/api";
import { createIdMap, todayForInput } from "../../services/utils";

/**
 * A new person: their details, the roles they start with (customer,
 * supplier, both or neither) and, for each role, the balance their paper
 * khaata stood at. City is required here for anyone with a role (register
 * R3, S5); business name and the rest are optional.
 */
const CreatePerson = () => {
  const { pending, run } = usePending();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [cities, setCities] = useState({});
  const [citiesLoading, setCitiesLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, control, watch } = useForm({
    defaultValues: {
      name: "", phone: "", email: "", city: "", business_name: "", address: "", notes: "",
      customer: false, supplier: false,
      receivable_amount: "", receivable_date: todayForInput(),
      payable_amount: "", payable_date: todayForInput(),
    },
  });

  const isCustomer = watch("customer");
  const isSupplier = watch("supplier");

  const cityOptions = useMemo(
    () => Object.entries(cities).map(([value, city]: [string, { name: string }]) => ({ value, label: city.name })),
    [cities],
  );

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await getCitiesList(token);
        if (res) {
          setCities(createIdMap(res));
        } else {
          toast.error("Failed to fetch cities");
        }
      } catch (error) {
        console.log("Error fetching cities:", error);
        toast.error("Failed to fetch cities");
      } finally {
        setCitiesLoading(false);
      }
    };
    fetchCities();
  }, [token]);

  const onCreate = async (data) => {
    if (!data.name.trim()) {
      toast.error("A name is needed.");
      return;
    }
    if ((data.customer || data.supplier) && !data.city) {
      toast.error("Pick a city: customers and suppliers need one.");
      return;
    }
    const opening = (amount, date) =>
      Number(amount) ? { amount: Math.floor(Number(amount)), as_of_date: date } : null;
    const payload = {
      name: data.name.trim(),
      phone: data.phone || null,
      email: data.email || null,
      city: data.city || null,
      business_name: data.business_name || null,
      address: data.address || null,
      notes: data.notes || null,
      roles: [data.customer && "customer", data.supplier && "supplier"].filter(Boolean),
      opening_balances: {
        ...(data.customer ? { receivable: opening(data.receivable_amount, data.receivable_date) } : {}),
        ...(data.supplier ? { payable: opening(data.payable_amount, data.payable_date) } : {}),
      },
    };
    try {
      const res = await createPerson(token, payload);
      if (res.ok) {
        toast.success(`${payload.name} added.`);
        navigate("/people/view-person", { state: { person_id: res.data.id } });
      } else {
        toast.error(res.error || "Failed to create the person.");
      }
    } catch (error) {
      console.log("Error creating person:", error);
      toast.error("Failed to create the person.");
    }
  };

  const openingFields = (side, label) => (
    <div className="flex gap-6">
      <div className="flex-1 space-y-1">
        <Label htmlFor={`${side}_amount`}>{label} opening balance (PKR)</Label>
        <Input id={`${side}_amount`} type="number" min="0" step="1" {...register(`${side}_amount` as const)} />
      </div>
      <div className="flex-1 space-y-1">
        <Label htmlFor={`${side}_date`}>Accurate as of</Label>
        <Input id={`${side}_date`} type="date" {...register(`${side}_date` as const)} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
        <Header />
        <main className="flex-1 p-6 space-y-6">
          <DynamicBreadCrumb />
          <form onSubmit={handleSubmit(run(onCreate))} className="flex w-full max-w-3xl flex-col gap-6">
            <h2 className="text-lg font-semibold">Add New Person</h2>

            <div className="flex gap-6">
              <div className="flex-1 space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register("name")} />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" {...register("phone")} />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-1 space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="city">City{isCustomer || isSupplier ? "" : " (optional)"}</Label>
                <Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      id="city"
                      options={cityOptions}
                      value={field.value}
                      onChange={field.onChange}
                      loading={citiesLoading}
                      placeholder="City"
                      emptyText="No cities yet."
                      notFoundText="No city matches that."
                    />
                  )}
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-1 space-y-1">
                <Label htmlFor="business_name">Business name (optional)</Label>
                <Input id="business_name" {...register("business_name")} />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="address">Address (optional)</Label>
                <Input id="address" {...register("address")} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>

            <fieldset className="space-y-3 rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium">Roles</legend>
              <p className="text-sm text-muted-foreground">
                Which screens list this person. Loans need no role: anyone can lend or borrow.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("customer")} />
                Customer · sales invoices and projects (Receivable)
              </label>
              {isCustomer && openingFields("receivable", "Receivable")}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("supplier")} />
                Supplier · purchase invoices and quotations (Payable)
              </label>
              {isSupplier && openingFields("payable", "Payable")}
            </fieldset>

            <div className="flex justify-end">
              <SubmitButton type="submit" pending={pending} pendingLabel="Creating…">
                Create Person
              </SubmitButton>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default CreatePerson;
