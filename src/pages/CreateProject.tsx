import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { createIdMap, ProjectStatusMap, PQStatusMap } from "../../services/utils";
import { createCompleteProject, getCustomersList, suppliersAPIPackage, getProductVariantsList } from "../../services/api";
import { useAuth } from "../../services/AuthProvider"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { ArrowLeft, ArrowRight, CheckCircle2Icon, Plus, Trash2, X } from "lucide-react";

const CreateProject = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [step, setStep] = useState(1);
    const [success, setSuccess] = useState(false);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [quotationItems, setQuotationItems] = useState([]);
    const [taskValidationErrors, setTaskValidationErrors] = useState({});
    const [quotationValidationErrors, setQuotationValidationErrors] = useState({});
    const { token } = useAuth()
    const navigate = useNavigate();

    // react-hook-form setup
    const { register, handleSubmit, control, watch, trigger, formState: { errors } } = useForm({
        defaultValues: {
            name: "",
            customer: "",
            desc: "",
            status: "P",
            task_name: "",
            task_sd: "",
            task_ed: "",
            task_desc: "",
            quotation_no: "",
            quotation_status: "D",
            notes: "",
            product: "",
            supplier: "",
            unit_price: 0.0,
            quantity: 0
        },
    });

    const onProjectCreate = async (data) => {

        const {
            task_name,
            task_sd,
            task_ed,
            task_desc,
            quotation_no,
            quotation_status,
            notes,
            product,
            supplier,
            unit_price,
            quantity,
            ...cleanData
        } = data

        const quotation = {
            quotation_no,
            notes,
            status: quotation_status,
            items: quotationItems
        }

        console.log("Creating project with the data: ", {
            ...cleanData,
            tasks: tasks,
            quotations: [quotation]
        })

        try {
            const is_created = await createCompleteProject(token, {
                ...cleanData,
                tasks: tasks,
                quotations: [quotation]
            })
            console.log("after project creation: ", is_created)
            if (is_created) {
                setSuccess(true)
                return
            }
            else {
                toast.error("Failed to create project.");
            }
        } catch (error) {
            console.log("Error creating project:", error);
        }
    }

    const handlePreviousStep = () => {
        setStep(step - 1)
    }

    const handleNextStep = async () => {
        if (step === 1) {                                                                                                             
            const isValid = await trigger(["name", "customer"]);                                                                      
            if (!isValid) return;                                                                                                     
        }
        setStep(step + 1)
    }

    const addTask = async (name, task_sd, task_ed, desc) => {
        const errors = {};
        if (!name || name.trim() === "") errors.task_name = "Task name is required";
        setTaskValidationErrors(errors);

        if (Object.keys(errors).length > 0) return;

        setTasks((prev) => ([...prev, {
            name: name,
            start: task_sd,
            end: task_ed,
            description: desc
        }]))
    }

    const addQuotationItem = async (product, supplier, quantity, unit_price) => {
        const errors = {};
        if (!product) errors.product = "Product is required";
        if (!supplier) errors.supplier = "Supplier is required";
        if (!quantity || quantity === "" || quantity === "0") errors.quantity = "Quantity is required";
        if (!unit_price || unit_price === "" || unit_price === "0") errors.unit_price = "Unit price is required";
        setQuotationValidationErrors(errors);

        if (Object.keys(errors).length > 0) return;

        setQuotationItems((prev) => ([...prev, {
            product_id: parseInt(product),
            supplier_id: parseInt(supplier),
            quantity: parseInt(quantity),
            unit_price: parseFloat(unit_price)
        }]))
    }

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const customers = await getCustomersList(token)
                if (customers) {
                    const customerMap = createIdMap(customers)
                    setCustomers(customerMap)
                } else {
                    toast.error("Failed to fetch customers")
                }
            } catch (error) {
                console.log("Error fetching customers:", error)
                toast.error("Failed to fetch customers")
            }
        }

        const fetchProducts = async () => {
            if (!token) return;

            try {
                const products = await getProductVariantsList(token)
                if (products) {
                    const productMap = createIdMap(products)
                    setProducts(productMap)
                } else {
                    toast.error("Failed to fetch products")
                }
            } catch (error) {
                console.log("Error fetching products:", error)
                toast.error("Failed to fetch products")
            }
        }

        const fetchSuppliers = async () => {
            try {
                const suppliers = await suppliersAPIPackage.list(token)
                if (suppliers) {
                    const supplierMap = createIdMap(suppliers)
                    setSuppliers(supplierMap)
                } else {
                    toast.error("Failed to fetch suppliers")
                }
            } catch (error) {
                console.log("Error fetching suppliers:", error)
                toast.error("Failed to fetch suppliers")
            }
        }


        fetchProducts()
        fetchSuppliers()
        fetchCustomers()
    }, [token])

    useEffect(() => {
        if (!success) return;

        const timer = setTimeout(() => {
            setSuccess(false);
            toast.success("Project created successfully!");
            navigate('/projects');
        }, 3000);

        return () => clearTimeout(timer);
    }, [success])

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div
                className={`${sidebarCollapsed ? "ml-16" : "ml-64"
                    } transition-all duration-300 flex flex-col h-screen`}
            >
                <Header />

                <main className="flex-1 flex flex-col p-6 gap-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <form className="flex flex-col flex-1" onSubmit={handleSubmit(onProjectCreate)}>
                        {/* Step 1: Create New Project */}
                        {step === 1 && (
                            <div className="flex flex-row flex-1 gap-12 w-[48%]">
                                {/* First Column */}
                                <div className="flex flex-col flex-wrap flex-1">
                                    <h2 className="text-lg font-semibold mb-6">Enter Project Details</h2>

                                    <div className="flex gap-6 mb-6">
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                                            <Input id="name" type="text" {...register("name", { required: "Name is required" })} />
                                            {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
                                        </div>
                                    </div>

                                    <div className="flex gap-6 mb-6">
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="customer">Customer <span className="text-red-500">*</span></Label>
                                            <Controller
                                                name="customer"
                                                control={control}
                                                rules={{ required: "Customer is required" }}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select customer"></SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {customers && Object.keys(customers).length > 0 && Object.entries(customers).map(([key, customer]) => (
                                                                <SelectItem value={key} key={key}>
                                                                    {customer.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                            {errors.customer && <span className="text-red-500 text-sm">{errors.customer.message}</span>}
                                        </div>

                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="status">Status</Label>
                                            <Controller
                                                name="status"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(ProjectStatusMap).map(([key, value]) => (
                                                                <SelectItem value={key} key={key}>
                                                                    {value}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <Label htmlFor="desc">Description</Label>
                                        <Textarea
                                            id="desc"
                                            className="min-h-[200px]"
                                            {...register("desc")}
                                            placeholder="Enter description here"
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 mt-auto">
                                        <Button type="button" onClick={handleNextStep}>
                                            <ArrowRight />
                                            Add Tasks
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Add Tasks */}
                        {step === 2 && (
                            <div className="flex flex-col flex-1 overflow-hidden">
                                <h2 className="text-lg font-semibold mb-6">Add Project Tasks (Optional)</h2>
                                <div className="flex flex-row gap-12 flex-1">
                                    <div className="flex flex-col flex-wrap flex-1">
                                        <div className="flex gap-6 mb-6">
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                                                <Input id="name" type="text" {...register("task_name")} />
                                                {taskValidationErrors.task_name && <span className="text-red-500 text-sm">{taskValidationErrors.task_name}</span>}
                                            </div>
                                        </div>

                                        <div className="flex gap-6 mb-6">
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="date_due">Start Date</Label>
                                                <Input id="date_due" type="date" {...register("task_sd")} />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="delivery">End Date</Label>
                                                <Input id="delivery" type="date" {...register("task_ed")} />
                                            </div>
                                        </div>

                                        <div className="mb-6 h-auto space-y-1">
                                            <Label htmlFor="task_desc">Description</Label>
                                            <Textarea
                                                id="task_desc"
                                                className="min-h-[250px]"
                                                {...register("task_desc")}
                                                placeholder="Enter description here"
                                                rows={6}
                                            />
                                        </div>

                                        <div className="flex justify-between gap-3 mt-auto">
                                            <Button type="button" variant="outline" onClick={handlePreviousStep}>
                                                <ArrowLeft />
                                                Back
                                            </Button>
                                            <div className="flex justify-between gap-3">
                                                <Button variant="outline" type="button" onClick={() => addTask(
                                                    watch("task_name"),
                                                    watch("task_sd"),
                                                    watch("task_ed"),
                                                    watch("task_desc")
                                                )}>
                                                    <Plus />
                                                    Add Task
                                                </Button>
                                            </div>
                                        </div>

                                    </div>

                                    <div className="flex flex-col flex-wrap flex-1">
                                        {/* Added Tasks */}
                                        <div className="flex justify-between items-center mb-2">
                                            <Label>Added Tasks</Label>
                                        </div>

                                        {/* Added Tasks */}
                                        <div className="mb-6">
                                            <div className="space-y-[10px] h-[400px] overflow-y-auto">
                                                {tasks && tasks.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-card rounded-lg flex items-center px-4 py-2 border border-border box-border"
                                                    >
                                                        <div className="flex flex-col gap-2 text-sm flex-1">
                                                            <div className="flex-col">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="font-medium">{item.name}</div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="unstyled"
                                                                        className="p-0 hover:text-red-500 h-[10px]"
                                                                        onClick={() => {
                                                                            setTasks(prev => prev.filter((_, i) => i !== idx))
                                                                        }}>
                                                                        <X cursor={'pointer'} />
                                                                    </Button>
                                                                </div>
                                                                <div>from: {item.start} to: {item.end}</div>
                                                            </div>
                                                            <div className="text-muted-foreground">{item.description}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 mt-auto">
                                            <Button type="button" onClick={handleNextStep}>
                                                <ArrowRight />
                                                Add Quotation
                                            </Button>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Add Quotation */}
                        {step === 3 && (
                            <div className="flex flex-col flex-1">
                                <h2 className="text-lg font-semibold mb-6">Add Project Quotation</h2>
                                <div
                                    className="flex flex-row gap-12 h-auto"
                                >
                                    <div className="flex flex-col flex-wrap flex-1">

                                        <div className="flex gap-6 mb-6">
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="quotation_no">Quotation Number</Label>
                                                <Input id="quotation_no" type="text" {...register("quotation_no")} />
                                            </div>

                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="quotation_status">Status</Label>
                                                <Controller
                                                    name="quotation_status"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                                            <SelectContent>
                                                                {Object.entries(PQStatusMap).map(([key, value]) => (
                                                                    <SelectItem value={key} key={key}>
                                                                        {value}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-6 space-y-1">
                                            <Label htmlFor="notes">Notes</Label>
                                            <Textarea
                                                id="notes"
                                                className="min-h-[350px]"
                                                {...register("notes")}
                                                placeholder="Enter notes here"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col flex-wrap flex-1 gap-1">
                                        <div className="flex gap-1">
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="product">Select Product <span className="text-red-500">*</span></Label>
                                                <Controller
                                                    name="product"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                                                            <SelectContent>
                                                                {products && Object.keys(products).length > 0 && Object.entries(products).map(([key, item]) => (
                                                                    <SelectItem key={key} value={key}>
                                                                        {item.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                                {quotationValidationErrors.product && <span className="text-red-500 text-sm">{quotationValidationErrors.product}</span>}
                                            </div>

                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="supplier">Select Supplier <span className="text-red-500">*</span></Label>
                                                <Controller
                                                    name="supplier"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                                                            <SelectContent>
                                                                {suppliers && Object.keys(suppliers).length > 0 && Object.entries(suppliers).map(([key, item]) => (
                                                                    <SelectItem key={key} value={key}>
                                                                        {item.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                                {quotationValidationErrors.supplier && <span className="text-red-500 text-sm">{quotationValidationErrors.supplier}</span>}
                                            </div>

                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="unit_price">Unit Price <span className="text-red-500">*</span></Label>
                                                <Input id="unit_price" type="number" {...register("unit_price")} />
                                                {quotationValidationErrors.unit_price && <span className="text-red-500 text-sm">{quotationValidationErrors.unit_price}</span>}
                                            </div>

                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
                                                <Input id="quantity" type="number" {...register("quantity")} />
                                                {quotationValidationErrors.quantity && <span className="text-red-500 text-sm">{quotationValidationErrors.quantity}</span>}
                                            </div>
                                        </div>

                                        <Button type="button" variant="outline"
                                            onClick={() => addQuotationItem(
                                                watch("product"),
                                                watch("supplier"),
                                                watch("quantity"),
                                                watch("unit_price"),
                                            )}>
                                            <Plus />
                                            Add Quotation Item
                                        </Button>

                                        <div className="flex flex-col gap-1 h-[380px] overflow-y-auto">
                                            {quotationItems && quotationItems.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-card rounded-lg flex items-center px-4 py-2 border border-border box-border"
                                                >
                                                    <div className="flex flex-col gap-1 text-sm flex-1">
                                                        <div className="flex-col">
                                                            <div className="flex items-center justify-between">
                                                                <div className="font-medium">{products[item.product_id].name} by {suppliers[item.supplier_id].name}</div>
                                                                <Button
                                                                    type="button"
                                                                    variant="unstyled"
                                                                    className="p-0 hover:text-red-500 h-[10px]"
                                                                    onClick={() => {
                                                                        setQuotationItems(prev => prev.filter((_, i) => i !== idx))
                                                                    }}>
                                                                    <X cursor={'pointer'} />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="text-muted-foreground">{item.quantity} x PKR {item.unit_price}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-[20px] flex justify-between">
                                    <Button type="button" variant="outline" onClick={handlePreviousStep}>
                                        <ArrowLeft />
                                        Back
                                    </Button>
                                    
                                    <Button type="submit" className={`transition-colors duration-300 ease-in-out ${success ? "bg-[#4BB543]" : ""}`}>
                                        <CheckCircle2Icon />
                                        Complete Project Setup
                                    </Button>
                                </div>
                            </div>
                        )}
                    </form>
                </main>
            </div >
        </div >
    );
};

export default CreateProject;
