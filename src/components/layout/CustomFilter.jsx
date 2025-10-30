import React, { useState } from "react";
import * as DialogUI from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatFilterQuery } from "../../../services/utils";
import { ArrowLeft } from "lucide-react";

/**
 * Props:
 *  - template: object (initial filter values)
 *  - templateMapper: object (UI metadata for fields)
 *  - setData: function to update parent data
 *  - dataFetcher: async function (query?) => data
 *  - open: boolean (dialog open state)
 *  - setOpen: function (setOpen boolean)
 */
export default function CustomFilter({
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
          <DialogUI.DialogTitle>Filter Sales Records</DialogUI.DialogTitle>
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
