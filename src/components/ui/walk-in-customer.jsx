import { useState, useEffect } from "react";
import * as DialogUI from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

const emptyForm = () => ({ name: "", phone: "", city: "", email: "" });

/**
 * Captures the buyer on a counter sale, at the moment it is sent to them.
 *
 * Dumb on purpose: it owns the form and the city list, nothing else. Saving,
 * reassigning the invoice, generating the PDF and handing off to WhatsApp all
 * live in useInvoiceActions, so both Send buttons behave identically.
 */
function WalkInCustomer({ open, setOpen, defaultCityId, onSubmit }) {
  const { token } = useAuth();
  const [cities, setCities] = useState({});
  const [form, setForm] = useState(emptyForm());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch on open rather than on mount: the dialog is rendered on every list
  // page load but opened rarely.
  useEffect(() => {
    if (!open) return;

    setForm({ ...emptyForm(), city: defaultCityId ? String(defaultCityId) : "" });

    const fetchCities = async () => {
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
      }
    };
    fetchCities();
  }, [open, token, defaultCityId]);

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
          <DialogUI.DialogTitle>Who is this invoice for?</DialogUI.DialogTitle>
          <DialogUI.DialogDescription>
            This sale is recorded against the counter-sale customer, so there is
            no number to send it to. Add the buyer's details to put them on the
            invoice and send it over WhatsApp.
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
              placeholder="03001234567"
            />
            <p className="text-xs text-muted-foreground">
              The invoice is sent to this number on WhatsApp.
            </p>
          </div>

          <div className="space-y-1">
            <Label>City</Label>
            <Select value={form.city} onValueChange={setField("city")}>
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(cities).map(([key, city]) => (
                  <SelectItem value={key} key={key}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save & Send"}
          </Button>
        </DialogUI.DialogFooter>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}

export default WalkInCustomer;
