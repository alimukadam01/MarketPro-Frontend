import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import TargetForm, {
  NONE,
  loadTargetEntities,
} from "@/components/ui/target-form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Copy, Lock, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../services/AuthProvider";
import {
  duplicateTarget,
  getTargetCatalogue,
  targetsAPIPackage,
} from "../../services/api";
import { todayForInput } from "../../services/utils";
import { usePending } from "@/hooks/use-pending";
import { Spinner } from "@/components/ui/spinner";

const UpdateTarget = () => {
  const { pending, run } = usePending();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  // True until the record arrives, which the spinner beside the title
  // reports. A failure is the only thing that toasts.
  const [detailLoading, setDetailLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [catalogue, setCatalogue] = useState([]);
  const [entities, setEntities] = useState({});
  const [filters, setFilters] = useState([]);
  const [target, setTarget] = useState(null);
  const [success, setSuccess] = useState(false);
  const { token, user, getPermissions } = useAuth();
  const permissions = getPermissions("targets");
  const navigate = useNavigate();
  const location = useLocation();
  const targetId = location.state?.target_id;
  const businessId = localStorage.getItem("mp-business-id");

  const today = new Date();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      data_point: "",
      filter_dimension: NONE,
      filter_value: NONE,
      scope_type: "business",
      subject_type: NONE,
      subject_id: NONE,
      period_type: "month",
      period_year: today.getFullYear(),
      period_month: String(today.getMonth() + 1),
      period_quarter: String(Math.floor(today.getMonth() / 3) + 1),
      date_from: todayForInput(),
      date_to: todayForInput(),
      rolling_days: 30,
      target_value: "",
      rule_type: "threshold",
      outcome: "",
      notes: "",
    },
  });

  const onTargetUpdate = async (data) => {
    const payload = {
      name: data.name,
      data_point: data.data_point,
      scope_type: data.scope_type,
      period_type: data.period_type,
      target_value: Number(data.target_value),
      rule_type: "threshold",
      outcome: data.outcome || null,
      notes: data.notes || null,
      filters: filters.map(({ dimension, value_id, value_text }) =>
        value_id !== undefined
          ? { dimension, value_id }
          : { dimension, value_text },
      ),
    };

    if (data.scope_type === "subject") {
      payload.subject_type = data.subject_type;
      payload.subject_id = Number(data.subject_id);
    }

    if (data.period_type === "month") {
      payload.period_year = Number(data.period_year);
      payload.period_month = Number(data.period_month);
    } else if (data.period_type === "quarter") {
      payload.period_year = Number(data.period_year);
      payload.period_quarter = Number(data.period_quarter);
    } else if (data.period_type === "year") {
      payload.period_year = Number(data.period_year);
    } else if (data.period_type === "custom") {
      payload.date_from = data.date_from;
      payload.date_to = data.date_to;
    } else if (data.period_type === "rolling") {
      payload.rolling_days = Number(data.rolling_days);
    }

    try {
      const updated = await targetsAPIPackage.update(token, targetId, payload);
      if (updated) {
        setSuccess(true);
      } else {
        toast.error("Failed to update target.");
      }
    } catch (error) {
      console.log("Error updating target:", error);
      toast.error("Failed to update target.");
    }
  };

  const handleDuplicate = async () => {
    try {
      const done = await duplicateTarget(token, targetId);
      if (done) {
        toast.success("Target duplicated.");
        navigate("/targets");
      } else {
        toast.error("Failed to duplicate target.");
      }
    } catch (error) {
      console.log("Error duplicating target:", error);
      toast.error("Failed to duplicate target.");
    }
  };

  const handleDelete = async () => {
    try {
      const done = await targetsAPIPackage.delete(token, targetId);
      if (done) {
        toast.success("Target deleted.");
        navigate("/targets");
      } else {
        toast.error("Failed to delete target.");
      }
    } catch (error) {
      console.log("Error deleting target:", error);
      toast.error("Failed to delete target.");
    }
  };

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      setSuccess(false);
      toast.success("Target updated successfully!");
      navigate("/targets");
    }, 3000);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  useEffect(() => {
    if (!token) return;
    if (!targetId) {
      navigate("/targets");
      return;
    }

    const fetchTarget = async () => {
      try {
        const res = await targetsAPIPackage.detail(token, targetId);
        if (!res) {
          toast.error("Failed to fetch target.");
          return;
        }

        setTarget(res);
        setFilters(
          (res.filters || []).map((row) => ({
            dimension: row.dimension,
            ...(row.value_id !== null && row.value_id !== undefined
              ? { value_id: row.value_id }
              : { value_text: row.value_text }),
            label: row.label,
            dimension_label: row.dimension,
          })),
        );

        reset({
          name: res.name || "",
          data_point: res.data_point || "",
          filter_dimension: NONE,
          filter_value: NONE,
          scope_type: res.scope_type || "business",
          subject_type: res.subject_type || NONE,
          subject_id:
            res.subject_id !== null && res.subject_id !== undefined
              ? String(res.subject_id)
              : NONE,
          period_type: res.period_type || "month",
          period_year: res.period_year || today.getFullYear(),
          period_month: res.period_month
            ? String(res.period_month)
            : String(today.getMonth() + 1),
          period_quarter: res.period_quarter
            ? String(res.period_quarter)
            : String(Math.floor(today.getMonth() / 3) + 1),
          // Stored as dates, but an <Input type="date"> rejects a full ISO
          // datetime, so anything with a time component is trimmed.
          date_from: res.date_from
            ? String(res.date_from).split("T")[0]
            : todayForInput(),
          date_to: res.date_to
            ? String(res.date_to).split("T")[0]
            : todayForInput(),
          rolling_days: res.rolling_days || 30,
          target_value: res.target_value ?? "",
          rule_type: "threshold",
          outcome: res.outcome || "",
          notes: res.notes || "",
        });
      } catch (error) {
        console.log("Error fetching target:", error);
        toast.error("Failed to fetch target.");
      }
    };

    const fetchCatalogue = async () => {
      try {
        const res = await getTargetCatalogue(token);
        if (res) setCatalogue(res);
      } catch (error) {
        console.log("Error fetching target catalogue:", error);
      }
    };

    const fetchEntities = async () => {
      try {
        setEntities(await loadTargetEntities(token, businessId, user));
      } catch (error) {
        console.log("Error fetching target filter options:", error);
      }
    };

    fetchTarget().finally(() => setDetailLoading(false));
    fetchCatalogue();
    fetchEntities();
  }, [token, targetId]);

  const ended = target && target.is_open === false;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div
        className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col h-screen`}
      >
        <Header />

        <main className="flex-1 flex flex-col p-6 gap-6">
          <DynamicBreadCrumb />

          <div className="flex items-center space-x-3">
            <ArrowLeft
              className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary"
              onClick={() => navigate("/targets")}
            />
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-semibold">
                {target ? target.name : "Target"}
                {detailLoading && <Spinner size={18} label="Loading" />}
              </h1>
              {target && (
                <p className="text-sm text-muted-foreground">
                  {target.data_point_label} · {target.period_label}
                </p>
              )}
            </div>
          </div>

          {ended ? (
            // A closed period is a closed record. The arrangement for a new
            // period is set up by duplicating, which leaves the old one intact
            // as evidence of what the terms were and whether they were met.
            <>
              <div className="bg-card rounded-lg p-6 border space-y-2">
                <p className="text-sm text-muted-foreground">
                  This target's period has ended, so it can no longer be
                  changed. Duplicate it to carry the same arrangement into a new
                  period, or delete it.
                </p>
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-muted-foreground">Target</span>
                  <span>{target.target_value}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Measured by</span>
                  <span>{target.date_basis_label}</span>
                </div>
                {target.outcome && (
                  <p className="text-sm text-muted-foreground pt-2">
                    {target.outcome}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  className="flex items-center space-x-2"
                  disabled={!permissions?.["create"]}
                  onClick={handleDuplicate}
                >
                  {permissions?.["create"] ? (
                    <Copy className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>Duplicate</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2"
                  disabled={!permissions?.["delete"]}
                  onClick={handleDelete}
                >
                  {permissions?.["delete"] ? (
                    <Trash2 className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>Delete</span>
                </Button>
              </div>
            </>
          ) : (
            <form
              className="flex flex-col flex-1"
              onSubmit={handleSubmit(run(onTargetUpdate))}
            >
              <TargetForm
                                pending={pending}
                register={register}
                control={control}
                watch={watch}
                setValue={setValue}
                trigger={trigger}
                errors={errors}
                step={step}
                setStep={setStep}
                catalogue={catalogue}
                entities={entities}
                filters={filters}
                setFilters={setFilters}
                submitLabel="Save Target"
                success={success}
              />
            </form>
          )}
        </main>
      </div>
    </div>
  );
};

export default UpdateTarget;
