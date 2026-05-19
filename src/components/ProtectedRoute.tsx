import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../services/AuthProvider'
import { toast } from "sonner"

interface ProtectedRouteProps {
  children: JSX.Element
  /** If provided, redirect to / if this module is not view-accessible. */
  module?: string
  action?: string
}

/**
 * Wraps a route element with two guards:
 *  1. Token check  — no token → redirect to /login
 *  2. Module check — module provided and user can't view it → redirect to /
 *
 * If config hasn't loaded yet (null), the token check still passes and
 * no module redirect fires — the page renders and will re-check once
 * config is available.
 */
const ProtectedRoute = ({ children, module, action = null }: ProtectedRouteProps) => {
  const { token, config, getPermissions } = useAuth()
  const permissions = getPermissions(module)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  const shouldRedirect = module && config && permissions &&
  (config[module] === false || (action && permissions[action] === false))

  useEffect(() => {
    if (shouldRedirect) {
      toast.error("You do not have access to this page. Please contact admin.");
    }
  }, [shouldRedirect]);

  if (shouldRedirect) {
    return <Navigate to="/" replace />;
  }

  return children
}

export default ProtectedRoute
