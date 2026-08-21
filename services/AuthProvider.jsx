import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom'
import { toast } from "sonner"
import { getBusinessConfig, setUnauthorizedHandler } from './api'
import { isTokenExpired } from './utils'

// Create the context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {

  const navigate = useNavigate()

  const [token, setToken] = useState(() => {
    return localStorage.getItem("mp-access-token") || null;
  });

  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("mp-user");
    return storedUser ? JSON.parse(storedUser) : null;
  })

  const [config, setConfig] = useState(() => {
    const storedConfig = localStorage.getItem("mp-access-config");
    return storedConfig ? JSON.parse(storedConfig) : null;
  });

  const [permissions, setPermissions] = useState(() => {
    const storedPermissions = localStorage.getItem("mp-user-permissions");
    return storedPermissions ? JSON.parse(storedPermissions) : null;
  });
  

  // A page can fire several requests at once, and each would 401 on a dead
  // token. This makes sure the session only ends once.
  const expiryHandledRef = useRef(false)

  const clearSession = () => {
    localStorage.removeItem("mp-access-token");
    localStorage.removeItem("mp-user");
    localStorage.removeItem("mp-access-config");
    localStorage.removeItem("mp-business-id");
    localStorage.removeItem("mp-user-permissions");
    setToken(null);
    setUser(null);
    setConfig(null);
    setPermissions(null);
  }

  const endExpiredSession = useCallback(() => {
    if (expiryHandledRef.current) return
    expiryHandledRef.current = true

    clearSession()
    toast.error("Your session has expired. Please sign in again.")
    navigate('/login', { replace: true })
  }, [navigate])

  // Any 401 from the API means the token is no longer good.
  useEffect(() => {
    setUnauthorizedHandler(endExpiredSession)
  }, [endExpiredSession])

  // Catches a token that lapsed while the app was closed, before any request
  // has had a chance to fail.
  useEffect(() => {
    if (token && isTokenExpired(token)) {
      endExpiredSession()
    }
  }, [token, endExpiredSession])

  // Login: store token, user, and access config
  const login = (newToken, userData, businessId, accessConfig) => {

    expiryHandledRef.current = false

    localStorage.setItem("mp-access-token", newToken)
    localStorage.setItem("mp-business-id", businessId)
    localStorage.setItem("mp-access-config", JSON.stringify(accessConfig));
    
    const {permissions, ...userInfo} = userData
    localStorage.setItem("mp-user-permissions", JSON.stringify(permissions))
    console.log(userInfo)
    localStorage.setItem("mp-user", JSON.stringify(userInfo))
    

    setToken(newToken);
    setUser(userData);
    setConfig(accessConfig);
    setPermissions(permissions);
  };

  // Logout: clear everything
  const logout = () => {
    clearSession()
    navigate('/login')
  };

  const getPermissions = (module) => {
    return (permissions?.[module])
  }

  // Optional: derived state
  const isAuthenticated = !!token;

  const value = {
    token,
    login,
    logout,
    isAuthenticated,
    user,
    setUser,
    config,
    setConfig,
    getPermissions
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to access the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
