import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../services/AuthProvider'
import { isTokenExpired } from '../../services/utils'
import { toast } from "sonner"

interface ProtectedRouteProps {
  children: JSX.Element
  /** If provided, redirect to / if this module is not view-accessible. */
  module?: string
  action?: string
}

/**
 * Wraps a route element with two guards:
 *  1. Session check — no token, or one past its expiry → redirect to /login
 *  2. Module check  — module provided and user can't view it → redirect to /
 *
 * If config hasn't loaded yet (null), the session check still passes and
 * no module redirect fires — the page renders and will re-check once
 * config is available.
 *
 * Hooks run before either redirect so the order stays stable across renders.
 */
const ProtectedRoute = ({ children, module, action = null }: ProtectedRouteProps) => {
  const { token, config, getPermissions } = useAuth()
  const permissions = getPermissions(module)

  // An expired token is as good as no token: without this the app renders and
  // every request 401s, leaving the user staring at empty pages.
  const sessionOver = !token || isTokenExpired(token)

  const shouldRedirect = !sessionOver && module && config && permissions &&
  (config[module] === false || (action && permissions[action] === false))

  useEffect(() => {
    if (shouldRedirect) {
      toast.error("You do not have access to this page. Please contact admin.");
    }
  }, [shouldRedirect]);

  if (sessionOver) {
    return <Navigate to="/login" replace />
  }

  if (shouldRedirect) {
    return <Navigate to="/" replace />;
  }

  return children
}

export default ProtectedRoute
