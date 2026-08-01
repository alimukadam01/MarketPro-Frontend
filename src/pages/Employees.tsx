import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { UserCog, Plus, Pencil, Trash2 } from "lucide-react"

import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb"
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
  const [isLoading, setIsLoading] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<EmployeeForm>(defaultForm())

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

  const openEditDialog = (emp) => {
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

  const handleDelete = async (emp) => {
    try {
      const success = await deleteEmployee(token, businessId, emp.id)
      if (success) {
        toast.success("Employee removed.")
        setEmployees((prev) => prev.filter((e) => e.id !== emp.id))
      } else {
        toast.error("Failed to remove employee.")
      }
    } catch (error) {
      console.log("Error deleting employee:", error)
      toast.error("Failed to remove employee.")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />

      <div
        className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300`}
      >
        <Header />

        <main className="flex-1 p-6 space-y-6">
          <DynamicBreadCrumb />

          {/* Page header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCog className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Employees</h1>
                <p className="text-sm text-muted-foreground">
                  Manage team members and their module permissions.
                </p>
              </div>
            </div>
            <Button onClick={openCreateDialog} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
          </div>

          {/* Employee table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Modules with access</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-muted-foreground">
                      No employees yet. Click "Add Employee" to get started.
                    </td>
                  </tr>
                )}
                {employees.map((emp) => {
                  const permissions = emp.access?.permissions ?? {}
                  console.log(permissions)
                  const accessibleModules = ALL_MODULES.filter(
                    ({ key }) => permissions[key]?.view
                  )
                  return (
                    <tr key={emp.id} className="border-t hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">
                        {emp.user.first_name} {emp.user.last_name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.user.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {
                          accessibleModules.length === 0 ? (
                            <span className="text-muted-foreground text-xs">No access</span>
                          ) : (
                            accessibleModules.map(({ key, label }) => (
                              <Badge key={key} variant="secondary" className="text-xs">
                                {label}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(emp)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(emp)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
