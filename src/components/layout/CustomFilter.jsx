import React, { useState } from "react";
import * as DialogUI from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
 *
 * templateMapper entries:
 *  { label, type, placeholder }                        text / date / number
 *  { label, type: "checkbox" }                         checkbox
 *  { label, type: "select", options: [{value,label}] } dropdown
 */
export default function CustomFilter({
  title = "Filter Records",
  template,
  templateMapper,
  dataFetcher,
  open,
  setOpen,
}) {
  // make a fresh copy of template for local state
  const [filters, setFilters] = useState(() => ({ ...(template || {}) }));

  const handleChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const applyFilters = async () => {
    const query = formatFilterQuery(filters);
    await dataFetcher(query);    
    if (setOpen) setOpen(false);
  }

  const resetFilters = async () => {
    await dataFetcher();
    setFilters(() => ({ ...(template || {}) })); // reset local state
    if (setOpen) setOpen(false);
  }

  return (
    <DialogUI.Dialog open={!!open} onOpenChange={setOpen}>
      <DialogUI.DialogContent className="max-w-2xl">
        <DialogUI.DialogHeader className="flex items-center gap-3">
          <DialogUI.DialogTitle>{title}</DialogUI.DialogTitle>
        </DialogUI.DialogHeader>

        <div className="flex flex-wrap gap-4 my-4">
          {Object.entries(templateMapper || {}).map(([key, config]) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">{config.label}</label>

              {config.type === "checkbox" ? (
                <Checkbox
                  checked={!!filters[key]}
                  onCheckedChange={(checked) => handleChange(key, checked)}
                />
              ) : config.type === "select" ? (
                <Select
                  value={filters[key] ? filters[key] : ANY}
                  onValueChange={(value) =>
                    handleChange(key, value === ANY ? "" : value)
                  }
                >
                  <SelectTrigger className="w-56">
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
                  className="w-56"
                />
              )}
            </div>
          ))}
        </div>

        <DialogUI.DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={resetFilters} type="button">
            Reset
          </Button>
          <Button onClick={applyFilters} type="button">
            Apply Filters
          </Button>
        </DialogUI.DialogFooter>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}
