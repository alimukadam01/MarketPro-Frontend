import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom'
import { getBusinessConfig } from './api'

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
  

  // Login: store token, user, and access config
  const login = (newToken, userData, businessId, accessConfig) => {

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
    localStorage.removeItem("mp-access-token");
    localStorage.removeItem("mp-user");
    localStorage.removeItem("mp-access-config");
    localStorage.removeItem("mp-business-id");
    setToken(null);
    setUser(null);
    setConfig(null);

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
