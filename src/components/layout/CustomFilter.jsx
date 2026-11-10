import React, { useState } from "react";
import * as DialogUI from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useBusyAction } from "@/hooks/use-busy-action";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFilterQuery } from "../../../services/utils";
import { ArrowLeft } from "lucide-react";

/**
 * Radix refuses an empty string as a SelectItem value, so "no filter" needs a
 * stand-in. It is mapped back to "" on change, which is what formatFilterQuery
 * drops from the query string.
 */
const ANY = "__any__";

/**
 * Props:
 *  - title: string (dialog heading; defaults to "Filter Records")
 *  - template: object (initial filter values)
 *  - templateMapper: object (UI metadata for fields)
 *  - setData: function to update parent data
 *  - dataFetcher: async function (query?) => data
 *  - open: boolean (dialog open state)
 *  - setOpen: function (setOpen boolean)
 *  - onActiveChange: (count) => void, optional - how many filters are on
 *    after Apply or Reset, for the page's "Filter · 2" button
 *
 * templateMapper entries:
 *  { label, type, placeholder }                        text / date / number
 *  { label, type: "checkbox" }                         checkbox
 *  { label, type: "select", options: [{value,label}] } dropdown
 *  { label, type: "combobox", options, loading? }      searchable dropdown
 *  { label, type: "range", input: "number"|"date",     two inputs side by
 *    keys: [fromKey, toKey] }                          side, both ends kept
 *                                                      in the template
 *
 * A range's mapper key is just a name; its values live under `keys`.
 *
 * Use "combobox" over "select" once the list is long enough to need typing -
 * a business with 75 customers is past that - and because it is the same
 * picker the create and update forms use, so a filter looks like the field it
 * filters on. It takes the same emptyText / notFoundText as those forms.
 */
const filled = (value) => value !== undefined && value !== null && value !== "" && value !== false;

/** How many fields are on: a range counts once, whichever end is set. */
const activeCount = (filters, templateMapper) =>
  Object.entries(templateMapper || {}).filter(([key, config]) =>
    config.type === "range"
      ? (config.keys || []).some((part) => filled(filters[part]))
      : filled(filters[key])
  ).length;

export default function CustomFilter({
  title = "Filter Records",
  template,
  templateMapper,
  dataFetcher,
  open,
  setOpen,
  onActiveChange,
}) {
  // make a fresh copy of template for local state
  const [filters, setFilters] = useState(() => ({ ...(template || {}) }));

  const handleChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  // Both await the refetch before closing the dialog, so without this the
  // dialog just sits there after the click. One edit here covers the filter
  // button on every list page.
  const { busy, run } = useBusyAction();

  const applyFilters = async () => {
    const query = formatFilterQuery(filters);
    await dataFetcher(query);
    if (onActiveChange) onActiveChange(activeCount(filters, templateMapper));
    if (setOpen) setOpen(false);
  }

  // "" means "no filters" to the list pages (useListQuery). Called with no
  // argument it meant "refetch as you were", so Reset left the old filters
  // applied while the dialog looked cleared.
  const resetFilters = async () => {
    await dataFetcher("");
    setFilters(() => ({ ...(template || {}) })); // reset local state
    if (onActiveChange) onActiveChange(0);
    if (setOpen) setOpen(false);
  }

  return (
    <DialogUI.Dialog open={!!open} onOpenChange={setOpen}>
      <DialogUI.DialogContent className="max-w-2xl">
        <DialogUI.DialogHeader className="flex items-center gap-3">
          <DialogUI.DialogTitle>{title}</DialogUI.DialogTitle>
        </DialogUI.DialogHeader>

        {/* A two-column grid rather than flex-wrap. Every field used to carry
            a fixed w-56, so a row's fields never filled it and the right-hand
            edge was ragged. Equal columns make the box even, let a field span
            the full width with `fullWidth`, and - because placement follows
            the order of templateMapper - put each consecutive from/to pair of
            dates side by side without anything having to say so. */}
        <div className="grid grid-cols-2 gap-4 my-4">
          {Object.entries(templateMapper || {}).map(([key, config]) => (
            <div
              key={key}
              className={`flex flex-col gap-1 ${config.fullWidth ? "col-span-2" : ""}`}
            >
              <label className="text-sm text-gray-700">{config.label}</label>

              {config.type === "range" ? (
                // Min and max (or from and to) on one row, so a range reads
                // as one field rather than two that happen to sit together.
                <div className="flex items-center gap-2">
                  <Input
                    type={config.input || "number"}
                    aria-label={`${config.label} from`}
                    placeholder={config.input === "date" ? undefined : "Min"}
                    value={filters[config.keys[0]] ?? ""}
                    onChange={(e) => handleChange(config.keys[0], e.target.value)}
                    className="w-full"
                  />
                  <span className="shrink-0 text-sm text-muted-foreground">to</span>
                  <Input
                    type={config.input || "number"}
                    aria-label={`${config.label} to`}
                    placeholder={config.input === "date" ? undefined : "Max"}
                    value={filters[config.keys[1]] ?? ""}
                    onChange={(e) => handleChange(config.keys[1], e.target.value)}
                    className="w-full"
                  />
                </div>
              ) : config.type === "checkbox" ? (
                <Checkbox
                  checked={!!filters[key]}
                  onCheckedChange={(checked) => handleChange(key, checked)}
                />
              ) : config.type === "combobox" ? (
                <Combobox
                  id={key}
                  className="w-full"
                  options={config.options || []}
                  value={filters[key] ?? ""}
                  onChange={(value) => handleChange(key, value || "")}
                  loading={config.loading}
                  placeholder={config.placeholder || "Any"}
                  emptyText={config.emptyText}
                  notFoundText={config.notFoundText}
                  // So a chosen value can be dropped again without reopening
                  // the dialog, which is what the select's "Any" row does.
                  clearable
                />
              ) : config.type === "select" ? (
                <Select
                  value={filters[key] ? filters[key] : ANY}
                  onValueChange={(value) =>
                    handleChange(key, value === ANY ? "" : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={config.placeholder || "Any"} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Lets a chosen value be cleared again without reopening */}
                    <SelectItem value={ANY}>
                      {config.anyLabel || "Any"}
                    </SelectItem>
                    {(config.options || []).map((option) => (
                      <SelectItem value={option.value} key={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={config.type}
                  placeholder={config.placeholder}
                  value={filters[key] ?? ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full"
                />
              )}
            </div>
          ))}
        </div>

        <DialogUI.DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={run("reset", resetFilters)}
            disabled={!!busy}
            type="button"
          >
            {busy === "reset" && <Spinner size={16} />}
            Reset
          </Button>
          <Button onClick={run("apply", applyFilters)} disabled={!!busy} type="button">
            {busy === "apply" && <Spinner size={16} />}
            Apply Filters
          </Button>
        </DialogUI.DialogFooter>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}
