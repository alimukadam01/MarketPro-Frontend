import { useAuth } from '../../services/AuthProvider'

/**
 * Returns the CRUD access flags for a given module from the stored access config.
 *
 * Usage:
 *   const { canCreate, canEdit, canDelete } = useAccess('sales')
 *   {canCreate && <Button>New Invoice</Button>}
 */
export const useAccess = (module: string) => {
  const { config } = useAuth()
  const m = config?.modules?.[module]

  return {
    isAdmin:   config?.role === 'admin',
    enabled:   m?.enabled  ?? false,
    canView:   m?.view     ?? false,
    canCreate: m?.create   ?? false,
    canEdit:   m?.edit     ?? false,
    canDelete: m?.delete   ?? false,
  }
}
