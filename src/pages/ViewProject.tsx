import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { 
    createIdMap, 
    ProjectStatusMap, 
    PQStatusMap,
    SalesInvoiceStatusMap,
    PurchaseInvoiceStatusMap
} from "../../services/utils";
import {
    createCompleteProject,
    projectsAPIPackage,
    getCustomersList,
    ToggleQuotationItemFulfillment,
    ToggleProjectTaskCompletion,
    DeleteQuotationItem,
    getProductVariantsList,
    DeleteTask,
    deleteProjectSalesInvoice,
    deleteProjectPurchaseInvoice,
    patchResource
} from "../../services/api";
import { useAuth } from "../../services/AuthProvider"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { ArrowLeft, ArrowRight, CheckCircle2Icon, Edit, Edit2, Plus, Trash, Trash2, X } from "lucide-react";
import { Checkbox } from "@radix-ui/react-checkbox";

const ViewProject = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [step, setStep] = useState(1);
    const [success, setSuccess] = useState(false);
    const [products, setProducts] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [salesInvoices, setSalesInvoices] = useState([]);
    const [purchaseInvoices, setPurchaseInvoices] = useState([]);
    const [quotation, setQuotation] = useState(null);
    const [quotationItems, setQuotationItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [expandedTask, setExpandedTask] = useState(null);
    const [taskValidationErrors, setTaskValidationErrors] = useState({});
    const [quotationValidationErrors, setQuotationValidationErrors] = useState({});

    const { token } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const project_id = location.state?.project_id || null
    const debounceTimersRef = useRef({})

    const handleFieldPatch = (endpoint, field, value, delay = 1500) => {
        const key = `${endpoint}:${field}`
        if (debounceTimersRef.current[key]) clearTimeout(debounceTimersRef.current[key])
        debounceTimersRef.current[key] = setTimeout(async () => {
            const success = await patchResource(token, endpoint, { [field]: value })
            if (!success) toast.error("Failed to save changes.")
        }, delay)
    }

    // react-hook-form setup
    const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm({
        defaultValues: {
            name: "",
            customer: "",
            desc: "",
            status: "",
            quotation_no: "",
            quotation_status: "",
            notes: ""
        },
    })

    const populateProjectFields = (data) => {

        const quotation = data.purchase_quotations.length > 0 ? data.purchase_quotations[0].purchase_quotation : null
        const items = quotation && quotation.items
        const tasks = data.tasks

        setQuotation(quotation)
        reset({
            name: data.name,
            customer: String(data.customer),
            status: data.status,
            desc: data.desc,
            quotation_no: quotation.quotation_no,
            quotation_status: quotation.status,
            notes: quotation.notes
        })
        setQuotationItems(items)
        setTasks(tasks)
        setSalesInvoices(data.sales_invoices)
        setPurchaseInvoices(data.purchase_invoices)
    }

    const handleDeleteProjectInvoice = async (entryId, is_sales_invoice) => {
        try {
            const success = is_sales_invoice
                ? await deleteProjectSalesInvoice(token, project_id, entryId)
                : await deleteProjectPurchaseInvoice(token, project_id, entryId)

            if (success) {
                if (is_sales_invoice) {
                    setSalesInvoices(prev => prev.filter(e => e.id !== entryId))
                } else {
                    setPurchaseInvoices(prev => prev.filter(e => e.id !== entryId))
                }
                toast.success("Invoice removed from project.")
            } else {
                toast.error("Failed to remove invoice from project.")
            }
        } catch (error) {
            console.log("Error removing invoice from project:", error)
            toast.error("Failed to remove invoice from project.")
        }
    }

    const handleQuotationItem = async (index, item_id, action) => {
        try {
            let success = false
            if (action === "check") {
                success = await ToggleQuotationItemFulfillment(token, quotation.id, item_id)
                if (success === true) {
                    setQuotationItems((items) => items.map((item, i) =>
                        i === index ? { ...item, is_fulfilled: !item.is_fulfilled } : item
                    ))
                    return
                }

            } else if (action === "delete") {
                success = await DeleteQuotationItem(token, quotation.id, item_id)
                if (success === true) {
                    setQuotationItems(prev => prev.filter((_, i) => i !== index))
                    return
                }
            }


            toast.error("Error checking item. Please try again.")
        } catch (error) {
            console.log(error)
            toast.error("Error checking item. Please try again.")
        }
    }

    const handleTask = async (index, task_id, action) => {
        try {
            let success = false
            if (action === "check") {
                success = await ToggleProjectTaskCompletion(token, project_id, task_id)
                if (success === true) {
                    setTasks((tasks) => tasks.map((task, i) =>
                        i === index ? { ...task, is_complete: !task.is_complete } : task
                    ))
                    return
                }
                toast.error("Error checking item. Please try again.")
            } else if (action === "delete") {
                success = await DeleteTask(token, project_id, task_id)
                if (success === true) {
                    setTasks(prev => prev.filter((_, i) => i !== index))
                    return
                }
                toast.error("Error deleting item. Please try again.")
            }
        } catch (error) {
            console.log(error)
            toast.error("Error performing action. Please try again.")
        }
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

        fetchCustomers()
        fetchProducts()
    }, [token])

    useEffect(() => {

        const fetchProject = async () => {
            if (!token) return
            if (!project_id) return

            try {
                const project = await projectsAPIPackage.detail(token, project_id)
                if (project) {
                    populateProjectFields(project)
                } else {
                    toast.error("Failed to fetch project.")
                    navigate("/projects")
                }
            } catch (error) {
                console.log(error)
                toast.error("Failed to fetch project.")
                navigate("/projects")
            }
        }

        fetchProject()
    }, [products, project_id])

    {
        console.log("logging customer", watch("customer"))
    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div
                className={`${sidebarCollapsed ? "ml-16" : "ml-64"
                    } transition-all duration-300 flex flex-col h-screen`}
            >
                <Header />

                <main className="flex-1 p-6 space-y-6 h-full">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <div className="grid grid-cols-2 gap-4">
                        {/* Col 1 Row 1: Project Details */}
                        <div className="flex flex-col border border-light rounded-lg bg-card px-2 py-2">
                            <h2 className="text-xl font-semibold mb-2">Project Details</h2>
                            <Input id="name" className="text-xl font-semibold mb-2 w-fit" type="text" {...register("name", { required: "Name is required", onChange: (e) => handleFieldPatch(`/projects/${project_id}/`, "name", e.target.value) })} />
                            <Textarea
                                id="desc"
                                className="min-h-[40px]"
                                {...register("desc", { onChange: (e) => handleFieldPatch(`/projects/${project_id}/`, "desc", e.target.value) })}
                                placeholder="Enter description here"
                                rows={2}
                            />

                            <div className="flex gap-6">
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="customer">Customer <span className="text-red-500">*</span></Label>
                                    <Controller
                                        name="customer"
                                        control={control}
                                        rules={{ required: "Customer is required" }}
                                        render={({ field }) => (
                                            <Select onValueChange={(val) => { 
                                                field.onChange(val) 
                                                handleFieldPatch(`/projects/${project_id}/`, "customer", val, 0) 
                                            }} value={field.value}>
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
                                            <Select onValueChange={(val) => { field.onChange(val); handleFieldPatch(`/projects/${project_id}/`, "status", val, 0) }} value={field.value}>
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
                        </div>

                        {/* Col 2 Row 1: Project Tasks */}
                        <div className="flex flex-col border border-light rounded-lg bg-card px-2 py-2">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-xl font-semibold">Project Tasks</h2>
                                <Button type="button" variant="outline" size="sm" className="flex items-center gap-1" onClick={() => navigate("/projects/create-task", { state: { project_id } })}>
                                    <Plus /> Add Task
                                </Button>
                            </div>
                            <div className="flex flex-col gap-1">
                                {tasks.length === 0 && <p className="text-muted-foreground text-sm">No tasks yet.</p>}
                                {tasks.map((task, index) => (
                                    <div key={task.id} className="flex items-start gap-2">
                                        <div className="flex items-center h-7">
                                            <input
                                                type="checkbox"
                                                checked={task.is_complete}
                                                onChange={(e) => {
                                                    handleTask(index, task.id, "check")
                                                }}
                                                className="w-4 h-4 border border-light rounded-xs bg-neutral-secondary-medium"
                                            />
                                        </div>
                                        <div
                                            className="bg-card rounded-lg flex flex-col flex-1 px-2 py-1 bg-transparent border border-border box-border cursor-pointer"
                                            onClick={() => setExpandedTask(expandedTask === index ? null : index)}
                                        >
                                            <div className="flex justify-between">
                                                <div className="font-medium">{task.name}</div>
                                                <div className="text-muted-foreground text-sm">
                                                    {new Date(task.start).toLocaleDateString("en-GB")} → {new Date(task.end).toLocaleDateString("en-GB")}
                                                </div>
                                            </div>
                                            {expandedTask === index && (
                                                <div className="text-muted-foreground text-sm mt-1 border-t border-border pt-1">
                                                    {task.description}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center h-7">
                                            <Button
                                                type="button"
                                                variant="unstyled"
                                                className="p-0 hover:text-primary"
                                                onClick={() => navigate("/projects/update-task", { state: { project_id, task_id: task.id } })}
                                            >
                                                <Edit2 cursor={'pointer'} />
                                            </Button>
                                        </div>
                                        <div className="flex items-center h-7">
                                            <Button
                                                type="button"
                                                variant="unstyled"
                                                className="p-0 hover:text-red-500"
                                                onClick={() => handleTask(index, task.id, "delete")}
                                            >
                                                <Trash cursor={'pointer'} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Col 1 Row 2: Quotation Details */}
                        <div className="flex flex-col flex-wrap border border-light rounded-lg bg-card px-2 py-2">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-xl font-semibold">Quotation Details</h2>
                                <Button type="button" variant="outline" size="sm" className="flex items-center gap-1" onClick={() => navigate("/purchase-quotations/update-purchase-quotation", { state: { purchase_quotation_id: quotation?.id } })}>
                                    <Edit2 /> Update Quotation
                                </Button>
                            </div>
                            <div className="flex gap-6">
                                <div className="flex-1">
                                    <Label htmlFor="quotation_no">Quotation Number <span className="text-red-500">*</span></Label>
                                    <Input id="quotation_no" type="text" {...register("quotation_no", { onChange: (e) => handleFieldPatch(`/purchase-quotations/${quotation?.id}/`, "quotation_no", e.target.value) })} />
                                    {errors.quotation_no && <span className="text-red-500 text-sm">{errors.quotation_no}</span>}
                                </div>

                                <div className="flex-1">
                                    <Label htmlFor="quotation_status">Status</Label>
                                    <Controller
                                        name="quotation_status"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={(val) => { field.onChange(val); handleFieldPatch(`/purchase-quotations/${quotation?.id}/`, "status", val, 0) }} value={field.value}>
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

                            <div className="flex-1 ">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    className="min-h-[40px]"
                                    {...register("notes", { onChange: (e) => handleFieldPatch(`/purchase-quotations/${quotation?.id}/`, "notes", e.target.value) })}
                                    placeholder="Enter notes here"
                                    rows={2}
                                />
                            </div>

                            <div className="flex-col mb-1 flex-1 mt-2">
                                <div className="mb-1">
                                    <Label htmlFor="quotation_no">Quotation Items</Label>
                                </div>
                                {quotation && quotationItems.length > 0 &&
                                    <div className="flex gap-4 w-full">
                                        {/* Items Column */}
                                        <div className="flex flex-col gap-1 min-h-[120px] flex-1">
                                            {quotationItems.map((item, index) => (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.is_fulfilled}
                                                            onChange={(e) => {
                                                                handleQuotationItem(index, item.id, "check")
                                                            }}
                                                            className="w-4 h-4 border border-light rounded-xs bg-neutral-secondary-medium"
                                                        />
                                                    </div>

                                                    <div
                                                        key={index}
                                                        className="bg-card rounded-lg flex flex-1 justify-between px-2 py-1 bg-transparent border border-border box-border"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="font-medium">{item.product.base.name} ({item.product.name}) by {item.supplier.name}</div>
                                                        </div>
                                                        <div className="text-muted-foreground">{item.quantity} x PKR {item.unit_price}</div>
                                                    </div>

                                                    <Button
                                                        type="button"
                                                        variant="unstyled"
                                                        className="p-0 hover:text-red-500 h-[10px]"
                                                        onClick={() => handleQuotationItem(index, item.id, "delete")}>
                                                        <Trash cursor={'pointer'} />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>

                        {/* Col 2 Row 2: Sales & Purchase Invoices */}
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col border border-light rounded-lg bg-card px-2 py-2">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="text-xl font-semibold">Project Sales Invoices</h2>
                                    <Button type="button" variant="outline" size="sm" className="flex items-center gap-1" onClick={() => navigate("/sales/create-invoice", { state: { project_id, project_name: watch("name") } })}>
                                        <Plus/> Add Invoice
                                    </Button>
                                </div>
                                <div className="flex flex-col gap-1">
                                    {salesInvoices.length === 0 && <p className="text-muted-foreground text-sm">No sales invoices yet.</p>}
                                    {salesInvoices.map((entry) => (
                                        <div key={entry.id} className="flex items-center gap-2">
                                            <div className="bg-card rounded-lg flex flex-1 justify-between px-2 py-1 bg-transparent border border-border box-border">
                                                <div className="font-medium">{entry.sales_invoice.invoice_number} — {entry.sales_invoice.customer.name}</div>
                                                <div className="text-muted-foreground text-sm">{entry.sales_invoice.total_items} items · PKR {entry.sales_invoice.total.toLocaleString()} · {SalesInvoiceStatusMap[entry.sales_invoice.status]}</div>
                                            </div>
                                            <div className="flex items-center h-7">
                                                <Button type="button" variant="unstyled" className="p-0 hover:text-primary" onClick={() => navigate("/sales/update-invoice", { state: { invoice_id: entry.sales_invoice.id } })}>
                                                    <Edit2 cursor={'pointer'} />
                                                </Button>
                                            </div>
                                            <div className="flex items-center h-7">
                                                <Button type="button" variant="unstyled" className="p-0 hover:text-red-500" onClick={() => handleDeleteProjectInvoice(entry.id, true)}>
                                                    <Trash cursor={'pointer'} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col border border-light rounded-lg bg-card px-2 py-2">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="text-xl font-semibold">Project Purchase Invoices</h2>
                                    <Button type="button" variant="outline" size="sm" className="flex items-center gap-1" onClick={() => navigate("/purchases/create-invoice", { state: { project_id, project_name: watch("name") } })}>
                                        <Plus/> Add Invoice
                                    </Button>
                                </div>
                                <div className="flex flex-col gap-1">
                                    {purchaseInvoices.length === 0 && <p className="text-muted-foreground text-sm">No purchase invoices yet.</p>}
                                    {purchaseInvoices.map((entry) => (
                                        <div key={entry.id} className="flex items-center gap-2">
                                            <div className="bg-card rounded-lg flex flex-1 justify-between px-2 py-1 bg-transparent border border-border box-border">
                                                <div className="font-medium">{entry.purchase_invoice.invoice_number} — {entry.purchase_invoice.supplier.name}</div>
                                                <div className="text-muted-foreground text-sm">{entry.purchase_invoice.total_items} items · PKR {entry.purchase_invoice.total.toLocaleString()} · {PurchaseInvoiceStatusMap[entry.purchase_invoice.status]}</div>
                                            </div>
                                            <div className="flex items-center h-7">
                                                <Button type="button" variant="unstyled" className="p-0 hover:text-primary" onClick={() => navigate("/purchases/update-invoice", { state: { invoice_id: entry.purchase_invoice.id } })}>
                                                    <Edit2 cursor={'pointer'} />
                                                </Button>
                                            </div>
                                            <div className="flex items-center h-7">
                                                <Button type="button" variant="unstyled" className="p-0 hover:text-red-500" onClick={() => handleDeleteProjectInvoice(entry.id, false)}>
                                                    <Trash cursor={'pointer'} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div >
        </div >
    );
};

export default ViewProject;
