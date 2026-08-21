import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Plus, Edit, Trash2, Search } from "lucide-react"

import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb"
import DataTable from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import { useAuth } from "../../services/AuthProvider"
import {
  getEmployeesList,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../../services/api"

// All 11 modules the permission table covers
const ALL_MODULES = [
  { key: "sales",          label: "Sales" },
  { key: "purchases",      label: "Purchases" },
  { key: "inventory",      label: "Inventory" },
  { key: "products",       label: "Products" },
  { key: "customers",      label: "Customers" },
  { key: "suppliers",      label: "Suppliers" },
  { key: "locations",      label: "Locations" },
  { key: "expenses",       label: "Expenses" },
  { key: "projects",       label: "Projects" },
  { key: "quotations",     label: "Purchase Quotations" },
  { key: "returned_items", label: "Returned Items" },
  { key: "backlog_entries", label: "Backlog" },
  { key: "accounting",     label: "Accounting" },
]

const cols = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  {
    key: "modules",
    label: "Modules with access",
    render: (value) => (
      <div className="flex flex-wrap gap-1">
        {value.length === 0 ? (
          <span className="text-muted-foreground text-xs">No access</span>
        ) : (
          value.map(({ key, label }) => (
            <Badge key={key} variant="secondary" className="text-xs">
              {label}
            </Badge>
          ))
        )}
      </div>
    ),
  },
]

const ACTIONS = ["view", "create", "edit", "delete"] as const
type Action = typeof ACTIONS[number]

const emptyPermissions = () =>
  Object.fromEntries(
    ALL_MODULES.map(({ key }) => [key, { view: false, create: false, edit: false, delete: false }])
  )

interface EmployeeForm {
  first_name: string
  last_name: string
  email: string
  password: string
  re_password: string
  permissions: Record<string, Record<Action, boolean>>
}

const defaultForm = (): EmployeeForm => ({
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  re_password: "",
  permissions: emptyPermissions(),
})

const Employees = () => {
  const navigate = useNavigate()
  const { token, config, user } = useAuth()
  const businessId = localStorage.getItem("mp-business-id")

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [employees, setEmployees] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<EmployeeForm>(defaultForm())

  const toggleRowSelection = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    )
  }

  const employeesData = employees
    .filter((emp) => {
      const term = searchTerm.trim().toLowerCase()
      if (!term) return true
      const name = `${emp.user.first_name} ${emp.user.last_name}`.toLowerCase()
      return name.includes(term) || emp.user.email.toLowerCase().includes(term)
    })
    .map((emp) => {
      const permissions = emp.access?.permissions ?? {}
      return {
        id: emp.id,
        name: `${emp.user.first_name} ${emp.user.last_name}`,
        email: emp.user.email,
        modules: ALL_MODULES.filter(({ key }) => permissions[key]?.view),
      }
    })

  // Guard: non-admins get bounced to dashboard
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/")
    }
  }, [config, navigate])

  // Fetch employees on mount
  useEffect(() => {
    if (!businessId) return
    fetchEmployees()
  }, [token, businessId])

  const fetchEmployees = async () => {
    try {
      const data = await getEmployeesList(token, businessId)
      if (data) {
        setEmployees(data)
      } else {
        toast.error("Failed to fetch employees.")
      }
    } catch (error) {
      console.log("Error fetching employees:", error)
      toast.error("Failed to fetch employees.")
    }
  }

  const openCreateDialog = () => {
    setEditingId(null)
    setForm(defaultForm())
    setDialogOpen(true)
  }

  const openEditDialog = () => {
    if (selectedRows.length !== 1) return
    const emp = employees.find((item) => item.id === selectedRows[0])
    if (!emp) return

    setEditingId(emp.id)
    setForm({
      first_name: emp.user.first_name,
      last_name: emp.user.last_name,
      email: emp.user.email,
      re_password: "",
      password: "",
      permissions: {
        ...emptyPermissions(),
        ...emp.access.permissions,
      },
    })
    setDialogOpen(true)
  }

  const toggleAction = (moduleKey: string, action: Action) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: {
          ...prev.permissions[moduleKey],
          [action]: !prev.permissions[moduleKey]?.[action],
        },
      },
    }))
  }

  const toggleAllActions = (moduleKey: string, value: boolean) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: { view: value, create: value, edit: value, delete: value },
      },
    }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      if (editingId) {
        const success = await updateEmployee(token, businessId, editingId, {access: {permissions: form.permissions}})
        if (success) {
          toast.success("Employee updated.")
          setDialogOpen(false)
          await fetchEmployees()
        } else {
          toast.error("Failed to update employee.")
        }
      } else {
        if (!form.email || !form.password || !form.first_name || !form.last_name) {
          toast.error("Please fill in all fields.")
          setIsLoading(false)
          return
        }

        const success = await createEmployee(token, businessId, {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          re_password: form.password,
          permissions: form.permissions,
        })

        if (success) {
          toast.success("Employee created.")
          setDialogOpen(false)
          await fetchEmployees()
        } else {
          toast.error("Failed to create employee.")
        }
      }
    } catch (error) {
      console.log("Error saving employee:", error)
      toast.error("Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletion = async () => {
    if (selectedRows.length <= 0) return

    try {
      const results = await Promise.all(
        selectedRows.map((id) => deleteEmployee(token, businessId, id))
      )

      if (results.every(Boolean)) {
        toast.success("Employees removed.")
        setEmployees((prev) => prev.filter((e) => !selectedRows.includes(e.id)))
        setSelectedRows([])
      } else {
        toast.error("Failed to remove employees.")
        await fetchEmployees()
      }
    } catch (error) {
      console.log("Error deleting employees:", error)
      toast.error("Failed to remove employees.")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />

      <div
        className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}
      >
        <Header />

        <main className="flex-1 p-6 space-y-6">
          <div className="space-y-1">
            <DynamicBreadCrumb />

            <div className="flex items-center space-x-3">
              <ArrowLeft
                className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary"
                onClick={() => navigate("/")}
              />
              <div>
                <h1 className="text-2xl font-semibold">Employees Overview</h1>
                <p className="text-sm text-muted-foreground">
                  Manage team members and their module permissions.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search Employees"
                  className="pl-10 w-80"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
                onClick={openCreateDialog}
              >
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
                disabled={selectedRows.length !== 1}
                onClick={openEditDialog}
              >
                <Edit className="w-4 h-4" />
                <span>View/Update</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
                disabled={selectedRows.length === 0}
                onClick={handleDeletion}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </Button>
            </div>
          </div>

          {employeesData && employeesData.length > 0 ? (
            <DataTable
              columns={cols}
              data={employeesData}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
            />
          ) : null}
        </main>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Employee Permissions" : "Add Employee"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* User fields — shown only on create */}
            {!editingId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>First Name</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                    placeholder="Ali"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Last Name</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                    placeholder="Khan"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="ali@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Min 8 characters"
                  />
                </div>
              </div>
            )}

            {/* Permissions table */}
            <div>
              <p className="text-sm font-medium mb-2">Module Permissions</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Module</th>
                      {ACTIONS.map((a) => (
                        <th key={a} className="px-4 py-2 font-medium capitalize text-center">
                          {a}
                        </th>
                      ))}
                      <th className="px-4 py-2 font-medium text-center">All</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_MODULES.map(({ key, label }) => {
                      const modPerms = form.permissions[key] ?? {}
                      const allOn = ACTIONS.every((a) => modPerms[a])
                      return (
                        <tr key={key} className="border-t">
                          <td className="px-4 py-2 font-medium">{label}</td>
                          {ACTIONS.map((action) => (
                            <td key={action} className="px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={!!modPerms[action]}
                                onChange={() => toggleAction(key, action)}
                                className="cursor-pointer w-4 h-4"
                              />
                            </td>
                          ))}
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={allOn}
                              onChange={() => toggleAllActions(key, !allOn)}
                              className="cursor-pointer w-4 h-4"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Saving…" : editingId ? "Save Changes" : "Create Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Employees
