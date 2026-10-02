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
import { Controller } from "react-hook-form";
import { ArrowLeft, ArrowRight, CheckCircle2Icon, Plus, X } from "lucide-react";
import { formatPartyLabel, TargetPeriodTypeMap } from "../../../services/utils";
import {
  getCustomersList,
  getEmployeesList,
  getProductVariantsList,
  productsAPIPackage,
  suppliersAPIPackage,
} from "../../../services/api";

export const TOTAL_STEPS = 5;

// Radix will not accept "" as a SelectItem value, so an explicit sentinel
// stands in for "nothing chosen" and is stripped before the payload is built.
export const NONE = "none";

const PERIOD_TYPES = ["month", "quarter", "year", "custom", "rolling"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Which fields have to be valid before a step will advance.
 *
 * Step 2 is deliberately absent: filters are optional, so it advances freely.
 * Step 4 depends on the period type the user just picked, which is why this is a
 * function rather than a table.
 */
export const gateFor = (step, periodType, scopeType) => {
  if (step === 1) return ["name", "data_point"];
  if (step === 3) {
    return scopeType === "subject"
      ? ["scope_type", "subject_type", "subject_id"]
      : [];
  }
  if (step === 4) {
    return {
      month: ["period_year", "period_month"],
      quarter: ["period_year", "period_quarter"],
      year: ["period_year"],
      custom: ["date_from", "date_to"],
      rolling: ["rolling_days"],
    }[periodType] || [];
  }
  return [];
};

/**
 * The five step bodies of the target wizard, shared by Create and Update.
 *
 * The parent owns useForm and the submit; this component owns the fields and the
 * step navigation. Same division as payments.jsx. It exists so the two pages do
 * not carry two copies of the same 400 lines, which would drift.
 */
const TargetForm = ({
  register,
  control,
  watch,
  setValue,
  trigger,
  errors,
  step,
  setStep,
  catalogue,
  entities,
  filters,
  setFilters,
  submitLabel = "Create Target",
  success = false,
}) => {
  const dataPointCode = watch("data_point");
  const scopeType = watch("scope_type");
  const subjectType = watch("subject_type");
  const periodType = watch("period_type");
  const filterDimension = watch("filter_dimension");

  const spec = (catalogue || []).find((c) => c.code === dataPointCode);
  const dimensions = spec ? spec.filters : [];
  const subjectTypes = spec ? spec.subject_types : [];

  const activeDimension = dimensions.find((d) => d.code === filterDimension);
  const unitLabel = spec && spec.unit === "amount" ? "PKR" : "units";

  const handlePreviousStep = () => setStep(step - 1);

  const handleNextStep = async () => {
    const fields = gateFor(step, periodType, scopeType);
    if (fields.length > 0) {
      const isValid = await trigger(fields);
      if (!isValid) return;
    }
    setStep(step + 1);
  };

  // No useFieldArray anywhere in this codebase, so the added-filter list is a
  // plain array plus watch() on the two draft inputs, cleared with setValue.
  const addFilter = () => {
    if (!activeDimension) return;

    const value = watch("filter_value");
    if (!value || value === NONE) return;

    if (filters.some((f) => f.dimension === activeDimension.code)) return;

    const option =
      activeDimension.kind === "choice"
        ? (activeDimension.options || []).find((o) => o.value === value)
        : (entities[activeDimension.code] || []).find(
            (e) => String(e.id) === String(value),
          );

    setFilters((prev) => [
      ...prev,
      activeDimension.kind === "choice"
        ? {
            dimension: activeDimension.code,
            value_text: value,
            label: option ? option.label : value,
            dimension_label: activeDimension.label,
          }
        : {
            dimension: activeDimension.code,
            value_id: Number(value),
            label: option ? option.name : value,
            dimension_label: activeDimension.label,
          },
    ]);

    // setValue, not reset(..., { keepValues: true }). Read the RHF source: with
    // keepValues the branch that writes the passed values into the inputs is
    // skipped, so that call updates defaultValues and leaves the controls
    // exactly as they were. CreateSalesInvoice and CreateProject both use it to
    // clear draft inputs and both silently fail to.
    setValue("filter_dimension", NONE);
    setValue("filter_value", NONE);
  };

  const entityOptions = (code) => entities[code] || [];

  return (
    <>
      <p className="text-sm text-muted-foreground mb-6">
        Step {step} of {TOTAL_STEPS}
      </p>

      {/* Step 1: what to measure */}
      {step === 1 && (
        <div className="flex flex-row flex-1 gap-12 w-[48%]">
          <div className="flex flex-col flex-wrap flex-1">
            <h2 className="text-lg font-semibold mb-6">
              What do you want to measure?
            </h2>

            <div className="flex gap-6 mb-6">
              <div className="flex-1 space-y-1">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Jotun quarterly purchases"
                  {...register("name", { required: "A name is required" })}
                />
                {errors.name && (
                  <span className="text-red-500 text-sm">
                    {errors.name.message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-6 mb-6">
              <div className="flex-1 space-y-1">
                <Label htmlFor="data_point">
                  Measure <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="data_point"
                  control={control}
                  rules={{ required: "Choose what to measure" }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a measure"></SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {catalogue &&
                          catalogue.map((entry) => (
                            <SelectItem value={entry.code} key={entry.code}>
                              {entry.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.data_point && (
                  <span className="text-red-500 text-sm">
                    {errors.data_point.message}
                  </span>
                )}
              </div>
            </div>

            {/* Stated up front, because these two decide what the number means */}
            {spec && (
              <div className="bg-card rounded-lg p-4 border mb-6">
                <p className="text-sm text-muted-foreground">
                  Counted by: {spec.date_basis_label}.
                </p>
                <p className="text-sm text-muted-foreground">
                  {spec.returns_treatment}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-auto">
              <Button type="button" onClick={handleNextStep}>
                <ArrowRight />
                Add Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: which records count */}
      {step === 2 && (
        <div className="flex flex-row gap-12 flex-1">
          <div className="flex flex-col flex-1">
            <h2 className="text-lg font-semibold mb-6">
              Which records count? (Optional)
            </h2>

            {dimensions.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-6">
                This measure cannot be narrowed any further.
              </p>
            ) : (
              <>
                <div className="flex gap-6 mb-6">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="filter_dimension">Narrow by</Label>
                    <Controller
                      name="filter_dimension"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // The value list belongs to the dimension, so a
                            // stale selection must not survive the switch.
                            setValue("filter_value", NONE);
                          }}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a field"></SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Nothing</SelectItem>
                            {dimensions.map((dimension) => (
                              <SelectItem
                                value={dimension.code}
                                key={dimension.code}
                              >
                                {dimension.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="flex-1 space-y-1">
                    <Label htmlFor="filter_value">Value</Label>
                    <Controller
                      name="filter_value"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!activeDimension}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a value"></SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {activeDimension &&
                              activeDimension.kind === "choice" &&
                              (activeDimension.options || []).map((option) => (
                                <SelectItem
                                  value={option.value}
                                  key={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            {activeDimension &&
                              activeDimension.kind === "entity" &&
                              entityOptions(activeDimension.code).map(
                                (entity) => (
                                  <SelectItem
                                    value={String(entity.id)}
                                    key={entity.id}
                                  >
                                    {entity.name}
                                  </SelectItem>
                                ),
                              )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mb-6">
                  <Button variant="outline" type="button" onClick={addFilter}>
                    <Plus />
                    Add Filter
                  </Button>
                </div>
              </>
            )}

            <div className="flex justify-between gap-3 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviousStep}
              >
                <ArrowLeft />
                Back
              </Button>
              <Button type="button" onClick={handleNextStep}>
                <ArrowRight />
                Set Scope
              </Button>
            </div>
          </div>

          <div className="flex flex-col flex-1">
            <h2 className="text-lg font-semibold mb-6">Filters Applied</h2>
            <div className="space-y-[10px] h-[400px] overflow-y-auto">
              {filters && filters.length > 0 ? (
                filters.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-card rounded-lg flex items-center px-4 py-2 border border-border box-border"
                  >
                    <div className="flex flex-col gap-2 text-sm flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{item.label}</div>
                        <Button
                          type="button"
                          variant="unstyled"
                          className="p-0 hover:text-red-500 h-[10px]"
                          onClick={() =>
                            setFilters((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          <X cursor={"pointer"} />
                        </Button>
                      </div>
                      <div className="text-muted-foreground">
                        {item.dimension_label || item.dimension}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No filters. Every record this measure covers will be counted.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: whose number */}
      {step === 3 && (
        <div className="flex flex-row flex-1 gap-12 w-[48%]">
          <div className="flex flex-col flex-wrap flex-1">
            <h2 className="text-lg font-semibold mb-6">Whose number is it?</h2>

            <div className="flex gap-6 mb-6">
              <div className="flex-1 space-y-1">
                <Label htmlFor="scope_type">Scope</Label>
                <Controller
                  name="scope_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select scope"></SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business">
                          The whole business
                        </SelectItem>
                        <SelectItem
                          value="subject"
                          disabled={subjectTypes.length === 0}
                        >
                          One named subject
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {subjectTypes.length === 0 && (
              <p className="text-sm text-muted-foreground mb-6">
                This measure can only be set for the business as a whole.
              </p>
            )}

            {scopeType === "subject" && (
              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="subject_type">
                    Subject <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="subject_type"
                    control={control}
                    rules={{
                      validate: (value) =>
                        watch("scope_type") !== "subject" ||
                        (value && value !== NONE) ||
                        "Choose a subject type",
                    }}
                    render={({ field }) => (
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setValue("subject_id", NONE);
                        }}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type"></SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {subjectTypes.map((subject) => (
                            <SelectItem value={subject.code} key={subject.code}>
                              {subject.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.subject_type && (
                    <span className="text-red-500 text-sm">
                      {errors.subject_type.message}
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <Label htmlFor="subject_id">
                    Which one <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="subject_id"
                    control={control}
                    rules={{
                      validate: (value) =>
                        watch("scope_type") !== "subject" ||
                        (value && value !== NONE) ||
                        "Choose a subject",
                    }}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!subjectType || subjectType === NONE}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select one"></SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {entityOptions(subjectType).map((entity) => (
                            <SelectItem
                              value={String(entity.id)}
                              key={entity.id}
                            >
                              {entity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.subject_id && (
                    <span className="text-red-500 text-sm">
                      {errors.subject_id.message}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviousStep}
              >
                <ArrowLeft />
                Back
              </Button>
              <Button type="button" onClick={handleNextStep}>
                <ArrowRight />
                Set Period
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: over what period */}
      {step === 4 && (
        <div className="flex flex-row flex-1 gap-12 w-[48%]">
          <div className="flex flex-col flex-wrap flex-1">
            <h2 className="text-lg font-semibold mb-6">Over what period?</h2>

            <div className="flex gap-6 mb-6">
              <div className="flex-1 space-y-1">
                <Label htmlFor="period_type">Period</Label>
                <Controller
                  name="period_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a period"></SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PERIOD_TYPES.map((code) => (
                          <SelectItem value={code} key={code}>
                            {TargetPeriodTypeMap[code]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {(periodType === "month" ||
              periodType === "quarter" ||
              periodType === "year") && (
              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="period_year">
                    Year <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="period_year"
                    type="number"
                    {...register("period_year", {
                      required: "A year is required",
                      min: { value: 2000, message: "Year looks wrong" },
                    })}
                  />
                  {errors.period_year && (
                    <span className="text-red-500 text-sm">
                      {errors.period_year.message}
                    </span>
                  )}
                </div>

                {periodType === "month" && (
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="period_month">
                      Month <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="period_month"
                      control={control}
                      rules={{ required: "A month is required" }}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={String(field.value || "")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a month"></SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((month, index) => (
                              <SelectItem value={String(index + 1)} key={month}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.period_month && (
                      <span className="text-red-500 text-sm">
                        {errors.period_month.message}
                      </span>
                    )}
                  </div>
                )}

                {periodType === "quarter" && (
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="period_quarter">
                      Quarter <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="period_quarter"
                      control={control}
                      rules={{ required: "A quarter is required" }}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={String(field.value || "")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a quarter"></SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Q1 (Jan to Mar)</SelectItem>
                            <SelectItem value="2">Q2 (Apr to Jun)</SelectItem>
                            <SelectItem value="3">Q3 (Jul to Sep)</SelectItem>
                            <SelectItem value="4">Q4 (Oct to Dec)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.period_quarter && (
                      <span className="text-red-500 text-sm">
                        {errors.period_quarter.message}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {periodType === "custom" && (
              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="date_from">
                    From <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="date_from"
                    type="date"
                    {...register("date_from", {
                      required: "A start date is required",
                    })}
                  />
                  {errors.date_from && (
                    <span className="text-red-500 text-sm">
                      {errors.date_from.message}
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="date_to">
                    To <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="date_to"
                    type="date"
                    {...register("date_to", {
                      required: "An end date is required",
                      validate: (value) =>
                        !watch("date_from") ||
                        value >= watch("date_from") ||
                        "The end date cannot fall before the start date",
                    })}
                  />
                  {errors.date_to && (
                    <span className="text-red-500 text-sm">
                      {errors.date_to.message}
                    </span>
                  )}
                </div>
              </div>
            )}

            {periodType === "rolling" && (
              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="rolling_days">
                    Days <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rolling_days"
                    type="number"
                    {...register("rolling_days", {
                      required: "A number of days is required",
                      min: { value: 1, message: "At least one day" },
                    })}
                  />
                  {errors.rolling_days && (
                    <span className="text-red-500 text-sm">
                      {errors.rolling_days.message}
                    </span>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Counts back from today, today included. This period never
                    closes.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviousStep}
              >
                <ArrowLeft />
                Back
              </Button>
              <Button type="button" onClick={handleNextStep}>
                <ArrowRight />
                Set the Number
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: the number and what it earns */}
      {step === 5 && (
        <div className="flex flex-row gap-12 flex-1">
          <div className="flex flex-col flex-1">
            <h2 className="text-lg font-semibold mb-6">
              The number, and what it earns
            </h2>

            <div className="flex gap-6 mb-6">
              <div className="flex-1 space-y-1">
                <Label htmlFor="target_value">
                  Target ({unitLabel}) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="target_value"
                  type="number"
                  {...register("target_value", {
                    required: "A number is required",
                    min: { value: 1, message: "Must be more than zero" },
                  })}
                />
                {errors.target_value && (
                  <span className="text-red-500 text-sm">
                    {errors.target_value.message}
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <Label>Rule</Label>
                <p className="text-sm pt-2">
                  Reached when the number meets or passes the target.
                </p>
              </div>
            </div>

            <div className="flex flex-col flex-1 mb-6 space-y-1">
              <Label htmlFor="outcome">What reaching it earns</Label>
              <Textarea
                id="outcome"
                className="flex-1"
                placeholder="e.g. 3% quarterly discount. This is a note only. Nothing is calculated or applied."
                {...register("outcome")}
              />
            </div>

            <div className="flex justify-between gap-3 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviousStep}
              >
                <ArrowLeft />
                Back
              </Button>
              <Button
                type="submit"
                className={`transition-colors duration-300 ease-in-out ${success ? "bg-[#4BB543]" : ""}`}
              >
                <CheckCircle2Icon />
                {submitLabel}
              </Button>
            </div>
          </div>

          <div className="flex flex-col flex-1">
            <h2 className="text-lg font-semibold mb-6">Notes</h2>
            <div className="flex flex-col flex-1 mb-6 space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                className="flex-1"
                placeholder="Anything worth remembering about this target..."
                {...register("notes")}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * The dropdown contents the wizard needs, keyed by dimension or subject code.
 *
 * The catalogue endpoint deliberately does not inline these: a shop can have
 * thousands of customers. They come from the same list endpoints every other
 * form uses.
 *
 * "entered_by" and "employee" both carry USER ids, not Employee ids, because the
 * server filters on created_by. The owner is included, since the owner enters
 * records too and is not in the employee list.
 */
export const loadTargetEntities = async (token, businessId, owner) => {
  const entities = {
    customer: [],
    supplier: [],
    product: [],
    product_variant: [],
    entered_by: [],
    employee: [],
  };

  const settle = async (label, run) => {
    try {
      return await run();
    } catch (error) {
      console.log(`Error fetching ${label} for targets:`, error);
      return null;
    }
  };

  const [customers, suppliers, products, variants, employees] =
    await Promise.all([
      settle("customers", () => getCustomersList(token)),
      settle("suppliers", () => suppliersAPIPackage.list(token)),
      settle("products", () => productsAPIPackage.list(token)),
      settle("product variants", () => getProductVariantsList(token)),
      settle("employees", () => getEmployeesList(token, businessId)),
    ]);

  entities.customer = (customers || []).map((c) => ({ id: c.id, name: c.name }));
  // Lookup is by id, so `name` here is purely the label.
  entities.supplier = (suppliers || []).map((s) => ({
    id: s.id,
    name: formatPartyLabel(s),
  }));
  entities.product = (products || []).map((p) => ({ id: p.id, name: p.name }));
  entities.product_variant = (variants || []).map((v) => ({
    id: v.id,
    name: v.name,
  }));

  const people = (employees || [])
    .filter((e) => e.user)
    .map((e) => ({ id: e.user.id, name: e.user.email }));

  if (owner && owner.id) {
    people.unshift({
      id: owner.id,
      name: `${owner.email || owner.name || "Owner"} (owner)`,
    });
  }

  entities.entered_by = people;
  entities.employee = people;

  return entities;
};

export default TargetForm;
