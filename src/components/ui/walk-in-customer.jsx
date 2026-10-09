import { useState, useEffect, useMemo } from "react";
import * as DialogUI from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "../../../services/AuthProvider";
import { getCitiesList } from "../../../services/api";
import { createIdMap } from "../../../services/utils";
import { Combobox } from "@/components/ui/combobox";

const emptyForm = () => ({ name: "", phone: "", city: "", email: "" });

/** The same form, filled in from a customer the invoice already points at. */
const formFor = (customer, defaultCityId) => ({
  name: customer?.name || "",
  // Normally the one thing missing - it is why the dialog opened.
  phone: customer?.phone || "",
  city: String(customer?.city?.id || defaultCityId || ""),
  email: customer?.email || "",
});

/**
 * Collects the details needed to send an invoice over WhatsApp, in the two
 * situations where they are not there yet.
 *
 * With no `customer`, this is a counter sale: the invoice is against the
 * business's placeholder, nobody knows who bought it, so the form is blank and
 * saving creates a customer and moves the invoice onto them.
 *
 * With a `customer`, the buyer is known but has no phone number saved. The
 * form opens on their details so the number can be added without retyping the
 * rest, and saving updates that customer rather than making a second one.
 *
 * Dumb on purpose either way: it owns the form and the city list, nothing
 * else. Which of the two writes happens, generating the PDF and handing off to
 * WhatsApp all live in useInvoiceActions, so both Send buttons behave
 * identically.
 */
function WalkInCustomer({ open, setOpen, defaultCityId, customer = null, onSubmit }) {
  const { token } = useAuth();
  const [cities, setCities] = useState({});
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch on open rather than on mount: the dialog is rendered on every list
  // page load but opened rarely.
  const cityOptions = useMemo(
    () => Object.entries(cities).map(([value, city]) => ({ value, label: city.name })),
    [cities]);

  useEffect(() => {
    if (!open) return;

    setForm(
      customer
        ? formFor(customer, defaultCityId)
        : { ...emptyForm(), city: defaultCityId ? String(defaultCityId) : "" },
    );

    const fetchCities = async () => {
      // re-armed, not just initialised: this effect re-runs every time the
      // dialog is opened
      setCitiesLoading(true);
      try {
        const res = await getCitiesList(token);
        if (res) {
          setCities(createIdMap(res));
        } else {
          toast.error("Failed to fetch cities.");
        }
      } catch (error) {
        console.log("Error fetching cities:", error);
        toast.error("Failed to fetch cities.");
      } finally {
        setCitiesLoading(false);
      }
    };
    fetchCities();
    // customer?.id rather than customer: the object is rebuilt on every parent
    // render, which would re-run this and wipe what the user had typed.
  }, [open, token, defaultCityId, customer?.id]);

  const setField = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter the customer's name.");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("A phone number is required — the invoice is sent to it.");
      return;
    }
    if (!form.city) {
      toast.error("Please select a city.");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: Number(form.city),
        // Omitted rather than sent blank, so the field stays genuinely unset.
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogUI.Dialog open={open} onOpenChange={setOpen}>
      <DialogUI.DialogContent className="max-w-lg">
        <DialogUI.DialogHeader>
          <DialogUI.DialogTitle>
            {customer ? "Add a phone number" : "Who is this invoice for?"}
          </DialogUI.DialogTitle>
          <DialogUI.DialogDescription>
            {customer ? (
              <>
                {customer.name} has no phone number saved, so there is nothing
                to send the invoice to. Add one below — their other details are
                already filled in and can be corrected if anything has changed.
              </>
            ) : (
              <>
                This sale is recorded against the counter-sale customer, so
                there is no number to send it to. Add the buyer's details to
                put them on the invoice and send it over WhatsApp.
              </>
            )}
          </DialogUI.DialogDescription>
        </DialogUI.DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setField("name")(e.target.value)}
              placeholder="Customer name"
            />
          </div>

          <div className="space-y-1">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setField("phone")(e.target.value)}
              // "e.g." rather than a bare number, which is how the rest of the
              // app writes example placeholders. It matters more here than
              // elsewhere: every other field in this dialog is genuinely
              // prefilled when an existing customer is being edited, so a grey
              // 03001234567 read as the number already on file rather than as
              // an empty field. Spaced, because whatsapp_number() strips
              // non-digits anyway and a local number is what people type.
              placeholder="e.g. 0300 1234567"
            />
            <p className="text-xs text-muted-foreground">
              The invoice is sent to this number on WhatsApp.
            </p>
          </div>

          <div className="space-y-1">
            <Label>City</Label>
            <Combobox
              options={cityOptions}
              value={form.city}
              onChange={setField("city")}
              loading={citiesLoading}
              placeholder="Select city"
              emptyText="No cities yet."
              notFoundText="No city matches that."
            />
          </div>

          <div className="space-y-1">
            <Label>Email (optional)</Label>
            <Input
              value={form.email}
              onChange={(e) => setField("email")(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>
        </div>

        <DialogUI.DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <SubmitButton onClick={handleSubmit} pending={isSaving} pendingLabel="Saving…">
            Save &amp; Send
          </SubmitButton>
        </DialogUI.DialogFooter>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}

export default WalkInCustomer;
