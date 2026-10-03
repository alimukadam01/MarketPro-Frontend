import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import TargetForm, {
  NONE,
  loadTargetEntities,
} from "@/components/ui/target-form";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../services/AuthProvider";
import { getTargetCatalogue, targetsAPIPackage } from "../../services/api";
import { todayForInput } from "../../services/utils";
import { usePending } from "@/hooks/use-pending";

const CreateTarget = () => {
  const { pending, run } = usePending();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [step, setStep] = useState(1);
  const [catalogue, setCatalogue] = useState([]);
  const [entities, setEntities] = useState({});
  const [filters, setFilters] = useState([]);
  const [success, setSuccess] = useState(false);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const businessId = localStorage.getItem("mp-business-id");

  const today = new Date();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      data_point: "",
      // Draft inputs for the filter row; never submitted.
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

  const onTargetCreate = async (data) => {
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

    // Only the fields the chosen period actually uses. The server clears the
    // rest anyway, but sending a stale date would be misleading in the request.
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
      const created = await targetsAPIPackage.create(token, payload);
      if (created) {
        setSuccess(true);
      } else {
        toast.error("Failed to create target.");
      }
    } catch (error) {
      console.log("Error creating target:", error);
      toast.error("Failed to create target.");
    }
  };

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      setSuccess(false);
      toast.success("Target created successfully!");
      navigate("/targets");
    }, 3000);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  useEffect(() => {
    if (!token) return;

    const fetchCatalogue = async () => {
      try {
        const res = await getTargetCatalogue(token);
        if (res) {
          setCatalogue(res);
        } else {
          toast.error("Failed to fetch what can be measured.");
        }
      } catch (error) {
        console.log("Error fetching target catalogue:", error);
        toast.error("Failed to fetch what can be measured.");
      }
    };

    const fetchEntities = async () => {
      try {
        setEntities(await loadTargetEntities(token, businessId, user));
      } catch (error) {
        console.log("Error fetching target filter options:", error);
      }
    };

    fetchCatalogue();
    fetchEntities();
  }, [token, businessId, user]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div
        className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col h-screen`}
      >
        <Header />

        <main className="flex-1 flex flex-col p-6 gap-6">
          <DynamicBreadCrumb />

          <div className="bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground">
              A target measures records you already enter. It changes nothing on
              its own: reaching one is shown here and nowhere else, and no
              discount or entry is ever created from it.
            </p>
          </div>

          <form
            className="flex flex-col flex-1"
            onSubmit={handleSubmit(run(onTargetCreate))}
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
              submitLabel="Create Target"
              success={success}
            />
          </form>
        </main>
      </div>
    </div>
  );
};

export default CreateTarget;
