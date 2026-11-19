import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, MessageSquare, Plus, Scale, Send, Trash2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PeriodMetricCard } from "@/components/dashboard/PeriodMetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import SaveStatus from "@/components/ui/save-status";
import PartyLedgerSection from "@/components/ui/party-ledger";
import RecordPaymentDialog from "@/components/ui/record-payment-dialog";
import SetOffDialog from "@/components/ui/set-off-dialog";
import PersonDeleteDialog from "@/components/ui/person-delete-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useFieldPatch } from "@/hooks/use-field-patch";
import { ALL_TIME, PAGE_PERIODS } from "../../services/periods";
import { useAuth } from "../../services/AuthProvider";
import {
  changePersonRole,
  getCitiesList,
  getCustomerDetail,
  getCustomerSummary,
  getPartyLedger,
  getPerson,
  getSupplierSummary,
  saveOpeningBalance,
  suppliersAPIPackage,
} from "../../services/api";
import {
  createIdMap,
  formatCurrency,
  formatDate,
  partyStatementText,
  personNetLabel,
  personReminderText,
  personRolesLabel,
  todayForInput,
} from "../../services/utils";

/**
 * One person's page (People, register #13, #15, #19, #25, #28).
 *
 * The person is one record; customer and supplier are roles they may hold.
 * Their khaata has two sides, Receivable and Payable, settled separately:
 * the net is for reference only, and the sides cancel only through a set-off.
 * A role is deactivated, never deleted; only the person is deleted, after a
 * preview of everything that goes with them.
 */

const SIDES = [
  { key: "both", label: "Both sides" },
  { key: "receivable", label: "Receivable" },
  { key: "payable", label: "Payable" },
];

const ROLE_INFO = {
  customer: {
    label: "Customer",
    side: "Receivable",
    listed: "Listed in sales invoices and projects.",
  },
  supplier: {
    label: "Supplier",
    side: "Payable",
    listed: "Listed in purchase invoices and quotations.",
  },
};

const Person = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [person, setPerson] = useState(null);
  const [cities, setCities] = useState({});
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [side, setSide] = useState("both");
  const [range, setRange] = useState({ from: "", to: "" });
  const [ledger, setLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [payParty, setPayParty] = useState(null);
  const [setOffOpen, setSetOffOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmRole, setConfirmRole] = useState(null);
  const [roleBusy, setRoleBusy] = useState(false);
  const [openings, setOpenings] = useState({
    receivable: { amount: "", date: todayForInput() },
    payable: { amount: "", date: todayForInput() },
  });
  const [savingOpening, setSavingOpening] = useState(null);
  const { token, getPermissions } = useAuth();
  const permissions = getPermissions("people");
  const canSeeAccounting = !!getPermissions("accounting")?.["view"];
  const canEditAccounting = !!getPermissions("accounting")?.["edit"];
  const navigate = useNavigate();
  const location = useLocation();
  // Reached with a person_id, or from a screen that only knows the role:
  // an invoice's customer, a backlog record's supplier. Those are looked up.
  const [personId, setPersonId] = useState(location.state?.person_id || null);
  const roleRef = location.state?.customer_id
    ? { kind: "customer", id: location.state.customer_id }
    : location.state?.supplier_id
      ? { kind: "supplier", id: location.state.supplier_id }
      : null;
  const endpoint = `/people/${personId}/`;
  // The list this page was opened from: /people, or /accounting/ledgers.
  const backTo = "/" + location.pathname.split("/").filter(Boolean).slice(0, -1).join("/");

  useEffect(() => {
    if (personId || !roleRef || !token) return;
    const resolve = async () => {
      try {
        const role = roleRef.kind === "customer"
          ? await getCustomerDetail(token, roleRef.id)
          : await suppliersAPIPackage.detail(token, roleRef.id);
        if (role?.person_id) {
          setPersonId(role.person_id);
        } else {
          toast.error("Failed to find that person.");
          navigate("/people");
        }
      } catch (error) {
        console.log("Error finding person:", error);
        toast.error("Failed to find that person.");
        navigate("/people");
      }
    };
    resolve();
  }, [token, roleRef?.kind, roleRef?.id]);
  const { patchField, status, retry } = useFieldPatch(token);

  const { register, control, reset, watch } = useForm({
    defaultValues: {
      name: "", phone: "", email: "", city: "", address: "", business_name: "", notes: "",
    },
  });

  const customer = person?.roles?.customer || null;
  const supplier = person?.roles?.supplier || null;
  const isWalkIn = !!person?.is_walk_in;

  const populate = (data) => {
    setPerson(data);
    reset({
      name: data.name || "",
      phone: data.phone || "",
      email: data.email || "",
      city: data.city?.id ? String(data.city.id) : "",
      address: data.address || "",
      business_name: data.business_name || "",
      notes: data.notes || "",
    });
    setOpenings({
      receivable: {
        amount: data.opening_balances?.receivable?.amount ? String(data.opening_balances.receivable.amount) : "",
        date: data.opening_balances?.receivable?.as_of_date || todayForInput(),
      },
      payable: {
        amount: data.opening_balances?.payable?.amount ? String(data.opening_balances.payable.amount) : "",
        date: data.opening_balances?.payable?.as_of_date || todayForInput(),
      },
    });
  };

  const fetchPerson = async () => {
    if (!token) return;
    if (!personId) {
      // Still being looked up from a customer or supplier id.
      if (!roleRef) navigate("/people");
      return;
    }
    try {
      const data = await getPerson(token, personId);
      if (data) {
        populate(data);
      } else {
        toast.error("Failed to fetch the person.");
        navigate("/people");
      }
    } catch (error) {
      console.log("Error fetching person:", error);
      toast.error("Failed to fetch the person.");
      navigate("/people");
    }
  };

  // The khaata is accounting data: fetched only for users allowed to see it.
  const fetchLedger = async (from = range.from, to = range.to, which = side) => {
    if (!token || !personId || !canSeeAccounting) {
      setLedgerLoading(false);
      return;
    }
    setLedgerLoading(true);
    try {
      const res = await getPartyLedger(token, { person_id: personId, side: which, date_from: from, date_to: to });
      if (res) {
        setLedger(res);
      } else {
        toast.error("Failed to fetch the khaata.");
      }
    } catch (error) {
      console.log("Error fetching khaata:", error);
      toast.error("Failed to fetch the khaata.");
    } finally {
      setLedgerLoading(false);
    }
  };

  const refreshAll = () => {
    fetchPerson();
    fetchLedger();
  };

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
    fetchPerson();
  }, [token, personId]);

  useEffect(() => {
    fetchLedger(range.from, range.to, side);
  }, [token, personId, side]);

  const onRole = async (kind, action) => {
    setRoleBusy(true);
    try {
      const res = await changePersonRole(token, personId, kind, action);
      if (res.ok) {
        populate(res.data);
        const verb = { add: "added", activate: "activated", deactivate: "deactivated" }[action];
        toast.success(`${ROLE_INFO[kind].label} role ${verb}.`);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (error) {
      console.log("Error changing role:", error);
      toast.error("Failed to change the role.");
    } finally {
      setRoleBusy(false);
      setConfirmRole(null);
    }
  };

  const onSaveOpening = async (sideKey) => {
    const role = sideKey === "receivable" ? customer : supplier;
    if (!role) return;
    setSavingOpening(sideKey);
    try {
      const ok = await saveOpeningBalance(token, {
        ...(sideKey === "receivable" ? { customerId: role.id } : { supplierId: role.id }),
        amount: Math.floor(Number(openings[sideKey].amount) || 0),
        asOfDate: openings[sideKey].date,
      });
      if (ok) {
        toast.success("Opening balance saved.");
        refreshAll();
      } else {
        toast.error("Failed to save the opening balance.");
      }
    } catch (error) {
      console.log("Error saving opening balance:", error);
      toast.error("Failed to save the opening balance.");
    } finally {
      setSavingOpening(null);
    }
  };

  const name = watch("name");
  const cityOptions = Object.entries(cities).map(([value, city]: [string, { name: string }]) => ({
    value,
    label: city.name,
  }));
  const cityName = cities[watch("city")]?.name;
  const needsCity = !watch("city") && (customer || supplier);
  const receivable = person?.receivable || 0;
  const payable = person?.payable || 0;
  // The server's wa.me number (one rule, root.utils.whatsapp_number), which
  // the khaata carries; worked out here only for users who cannot see it.
  const whatsapp =
    ledger?.party?.whatsapp || (watch("phone") || "").replace(/\D/g, "").replace(/^0/, "92");

  // Total Business: sales plus purchases invoiced (register R23), over the
  // card's own period, from each role this person holds.
  const totalBusiness = async (period) => {
    const parts = await Promise.all([
      customer ? getCustomerSummary(token, customer.id, period) : { total_business: 0 },
      supplier ? getSupplierSummary(token, supplier.id, period) : { total_business: 0 },
    ]);
    if (parts.some((part) => part == null)) return null;
    return { total_business: parts.reduce((sum, part) => sum + (part.total_business || 0), 0) };
  };

  const openWhatsApp = (text) => window.open(`https://wa.me/${whatsapp}?text=${text}`, "_blank");

  const sideSwitch = (
    <div role="group" aria-label="Side" className="inline-flex gap-1 rounded-lg bg-muted p-1">
      {SIDES.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={side === option.key}
          onClick={() => setSide(option.key)}
          className={cn(
            "h-8 rounded-md px-3 text-sm font-medium",
            side === option.key ? "bg-background shadow-sm" : "text-muted-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  // Reminder and statement go out for the side being viewed; in the
  // both-sides view, both and the net (register R31).
  const khaataActions = (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center space-x-2"
        disabled={!whatsapp || (side === "payable") || (side !== "payable" && !receivable)}
        onClick={() => openWhatsApp(personReminderText(name, side, receivable, payable))}
      >
        <MessageSquare className="w-4 h-4" />
        <span>Send Reminder</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center space-x-2"
        disabled={!whatsapp || !ledger}
        onClick={() => openWhatsApp(partyStatementText(name, ledger))}
      >
        <Send className="w-4 h-4" />
        <span>Share Statement</span>
      </Button>
    </div>
  );

  const roleRow = (kind) => {
    const info = ROLE_INFO[kind];
    const role = kind === "customer" ? customer : supplier;
    const sideBalance = kind === "customer" ? receivable : payable;
    let status = "Not held";
    let hint = `${info.listed} Add the role to use ${kind === "customer" ? "sales" : "purchase"} documents.`;
    let action = "add";
    let locked = false;
    if (role?.is_active) {
      status = "Active";
      action = "deactivate";
      if (kind === "customer" && isWalkIn) {
        locked = true;
        hint = "The counter-sale customer. It stays active for walk-in invoices.";
      } else if (sideBalance) {
        locked = true;
        hint = `${info.listed} Can be deactivated once ${info.side} ${formatCurrency(sideBalance)} is settled.`;
      } else {
        hint = `${info.listed} Deactivating keeps every record.`;
      }
    } else if (role) {
      status = "Inactive";
      action = "activate";
      hint = `Kept with its history, but not offered in ${kind === "customer" ? "sales" : "purchase"} documents.`;
    }
    const label = { add: "Add", activate: "Activate", deactivate: "Deactivate" }[action];
    return (
      <div key={kind} className="flex items-center justify-between gap-3 border-t py-3 first:border-t-0">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            {info.label}
            <span className="font-normal text-muted-foreground"> · {info.side} · {status}</span>
          </div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={locked || roleBusy || !permissions?.["edit"]}
          onClick={() => (action === "deactivate" ? setConfirmRole(kind) : onRole(kind, action))}
        >
          {label}
        </Button>
      </div>
    );
  };

  const openingRow = (sideKey) => {
    const role = sideKey === "receivable" ? customer : supplier;
    const label = sideKey === "receivable" ? "Receivable" : "Payable";
    const needs = sideKey === "receivable" ? "customer" : "supplier";
    return (
      <div key={sideKey} className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
        <div className="text-sm font-medium">{label}</div>
        {role ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`ob-${sideKey}`}>Amount (PKR)</Label>
              <Input
                id={`ob-${sideKey}`}
                type="number"
                min="0"
                step="1"
                value={openings[sideKey].amount}
                onChange={(e) => setOpenings({ ...openings, [sideKey]: { ...openings[sideKey], amount: e.target.value } })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`ob-${sideKey}-date`}>Accurate as of</Label>
              <Input
                id={`ob-${sideKey}-date`}
                type="date"
                value={openings[sideKey].date}
                onChange={(e) => setOpenings({ ...openings, [sideKey]: { ...openings[sideKey], date: e.target.value } })}
              />
            </div>
            <Button
              variant="outline"
              className="col-span-2"
              disabled={savingOpening === sideKey || !canEditAccounting}
              onClick={() => onSaveOpening(sideKey)}
            >
              {savingOpening === sideKey ? "Saving…" : `Save ${label.toLowerCase()} opening balance`}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Needs the {needs} role.</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
        <Header />
        <main className="flex-1 p-6 space-y-6">
          <DynamicBreadCrumb />

          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start space-x-3">
              <ArrowLeft
                className="w-5 h-5 mt-2 text-muted-foreground cursor-pointer hover:text-primary"
                onClick={() => navigate(backTo)}
              />
              <div>
                <h1 className="text-2xl font-semibold">{name || "Person"}</h1>
                <p className="text-sm text-muted-foreground">
                  {[personRolesLabel(person?.roles), watch("phone"), cityName].filter((part) => part && part !== "-").join(" · ")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {canSeeAccounting && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Record Payment
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={!customer} onSelect={() => setPayParty("customer")}>
                      {name || "They"} pays you{!customer ? " (needs the customer role)" : ""}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!supplier} onSelect={() => setPayParty("supplier")}>
                      You pay {name || "them"}{!supplier ? " (needs the supplier role)" : ""}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {canSeeAccounting && (
                <Button
                  variant="outline"
                  disabled={!receivable || !payable || !canEditAccounting}
                  onClick={() => setSetOffOpen(true)}
                >
                  <Scale className="w-4 h-4 mr-2" />
                  Set-off
                </Button>
              )}
              <Button
                variant="outline"
                disabled={!permissions?.["delete"] || isWalkIn}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Receivable"
              value={formatCurrency(receivable)}
              hint="What they owe you: sales, loans you gave"
              loading={!person}
            />
            <MetricCard
              title="Payable"
              value={formatCurrency(payable)}
              hint="What you owe them: purchases, loans you took"
              loading={!person}
            />
            <MetricCard
              title="Net"
              value={person ? personNetLabel(person) : ""}
              hint="For reference only; a set-off clears both sides"
              loading={!person}
            />
            {person && (
              <PeriodMetricCard
                title="Total Business"
                storageKey="person-total-business"
                defaultPeriod={ALL_TIME}
                periodOptions={PAGE_PERIODS}
                fetcher={totalBusiness}
                pick={(data: { total_business: number }) => formatCurrency(data.total_business)}
                errorMessage="Failed to fetch total business."
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold leading-5">Person details</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Changes save as you type.</p>
                </div>
                <SaveStatus status={status} onRetry={retry} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    disabled={!permissions?.["edit"] || isWalkIn}
                    {...register("name", { onChange: (e) => patchField(endpoint, "name", e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    disabled={!permissions?.["edit"]}
                    {...register("phone", { onChange: (e) => patchField(endpoint, "phone", e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    disabled={!permissions?.["edit"]}
                    {...register("email", { onChange: (e) => patchField(endpoint, "email", e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="city">City</Label>
                  <Controller
                    name="city"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        id="city"
                        options={cityOptions}
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          patchField(endpoint, "city", value, 0);
                        }}
                        loading={citiesLoading}
                        disabled={!permissions?.["edit"]}
                        placeholder="City"
                        emptyText="No cities yet."
                        notFoundText="No city matches that."
                      />
                    )}
                  />
                  {needsCity && (
                    <p className="text-xs text-destructive">
                      A city is needed for customers and suppliers. Pick one.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="business_name">Business name</Label>
                  <Input
                    id="business_name"
                    disabled={!permissions?.["edit"]}
                    {...register("business_name", {
                      onChange: (e) => patchField(endpoint, "business_name", e.target.value),
                    })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    rows={1}
                    className="h-10 min-h-10 resize-none"
                    disabled={!permissions?.["edit"]}
                    {...register("address", { onChange: (e) => patchField(endpoint, "address", e.target.value) })}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    rows={2}
                    placeholder="Anything worth remembering"
                    disabled={!permissions?.["edit"]}
                    {...register("notes", { onChange: (e) => patchField(endpoint, "notes", e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <section className="rounded-lg border bg-card p-6">
                <h2 className="text-base font-semibold leading-5">Roles</h2>
                <p className="mb-3 mt-1 text-sm text-muted-foreground">
                  Decide which screens list {name || "this person"}. Deactivating keeps every record; a role
                  with a balance stays active until that side is settled.
                </p>
                {roleRow("customer")}
                {roleRow("supplier")}
                <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                  Loans need no role. Anyone can lend to you or borrow from you: a loan you take goes on
                  Payable, a loan you give goes on Receivable.
                </p>
              </section>

              {canSeeAccounting && (
                <section className="rounded-lg border bg-card p-6 space-y-4">
                  <div>
                    <h2 className="text-base font-semibold leading-5">Opening balances</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      What stood between you before MarketPro, one per side.
                    </p>
                  </div>
                  {openingRow("receivable")}
                  {openingRow("payable")}
                </section>
              )}
            </div>
          </div>

          {canSeeAccounting && (
            <PartyLedgerSection
              title="Khaata"
              ledger={ledger}
              loading={ledgerLoading}
              titleExtra={sideSwitch}
              typeFilter
              sides={side === "both"}
              actions={khaataActions}
              onRangeApply={(from, to) => {
                setRange({ from, to });
                fetchLedger(from, to, side);
              }}
            />
          )}

          {canSeeAccounting && payParty && (
            <RecordPaymentDialog
              party={payParty}
              partyId={payParty === "customer" ? customer?.id : supplier?.id}
              partyName={name}
              open={!!payParty}
              setOpen={(open) => !open && setPayParty(null)}
              onRecorded={refreshAll}
            />
          )}

          {person && (
            <SetOffDialog
              person={person}
              receivable={receivable}
              payable={payable}
              open={setOffOpen}
              setOpen={setSetOffOpen}
              onRecorded={refreshAll}
            />
          )}

          <PersonDeleteDialog
            personId={person?.id ?? null}
            personName={person?.name || ""}
            open={deleteOpen}
            setOpen={setDeleteOpen}
            onDeleted={() => navigate(backTo)}
          />

          <AlertDialog open={!!confirmRole} onOpenChange={(open) => !open && setConfirmRole(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Deactivate the {confirmRole ? ROLE_INFO[confirmRole].label.toLowerCase() : ""} role?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {name} stays in People and keeps all their{" "}
                  {confirmRole === "customer" ? "sales" : "purchase"} history, but won't appear in{" "}
                  {confirmRole === "customer" ? "sales" : "purchase"} dropdowns. You can activate it again
                  later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={roleBusy} onClick={() => onRole(confirmRole, "deactivate")}>
                  Deactivate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {person?.last_activity && (
            <p className="text-xs text-muted-foreground">Last activity {formatDate(person.last_activity)}</p>
          )}
        </main>
      </div>
    </div>
  );
};

export default Person;
