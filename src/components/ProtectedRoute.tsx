import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../services/AuthProvider'
import { ACCESS_DENIED_MESSAGE, isTokenExpired } from '../../services/utils'
import { toast } from "sonner"
import { useIsPhone } from '@/hooks/use-phone'
import PhoneBlocked from '@/components/phone/PhoneBlocked'
import PhoneDataEntry from '@/components/phone/PhoneDataEntry'

interface ProtectedRouteProps {
  children: JSX.Element
  /** If provided, redirect to / if this module is not view-accessible. */
  module?: string
  action?: string
  /**
   * The backlog entry screens. A data entry account (role "backlog") can
   * reach only these - any other route sends it to its queue - and of
   * everyone else only the owner may enter pages themselves.
   */
  entry?: boolean
  /**
   * Opens on a phone: the dashboard and the upload form. Any other page shows
   * PhoneBlocked there instead, and a data entry account gets PhoneDataEntry
   * on every page.
   */
  phone?: boolean
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
const ProtectedRoute = ({ children, module, action = null, entry = false, phone = false }: ProtectedRouteProps) => {
  const { token, config, user, getPermissions } = useAuth()
  const isDataEntry = user?.role === "backlog"
  const permissions = getPermissions(module)
  const isPhone = useIsPhone()

  // An expired token is as good as no token: without this the app renders and
  // every request 401s, leaving the user staring at empty pages.
  const sessionOver = !token || isTokenExpired(token)

  // A page a phone doesn't open shows a screen saying so, not the module
  // check's "access denied" toast and bounce.
  const phoneBlocked = isPhone && (isDataEntry || !phone)

  const shouldRedirect = !sessionOver && !phoneBlocked && module && config && permissions &&
  (config[module] === false || (action && permissions[action] === false))

  useEffect(() => {
    if (shouldRedirect) {
      toast.error(ACCESS_DENIED_MESSAGE);
    }
  }, [shouldRedirect]);

  if (sessionOver) {
    return <Navigate to="/login" replace />
  }

  if (isPhone && isDataEntry) {
    return <PhoneDataEntry />
  }

  if (isDataEntry && !entry) {
    return <Navigate to="/backlog/work" replace />
  }

  if (entry && !isDataEntry && user && user.role !== "admin") {
    return <Navigate to="/" replace />
  }

  if (phoneBlocked) {
    return <PhoneBlocked />
  }

  if (shouldRedirect) {
    return <Navigate to="/" replace />;
  }

  return children
}

export default ProtectedRoute
