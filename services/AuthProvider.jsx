import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom'

// Create the context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {

  const navigate = useNavigate()

  const [token, setToken] = useState(() => {
    // Read token from localStorage on initial load
    return localStorage.getItem("mp-access-token") || null;
  });

  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("mp-user");
    return storedUser ? JSON.parse(storedUser) : null;
  })

  // Login: store token in both state and localStorage
  const login = (newToken, userData) => {
    localStorage.setItem("mp-access-token", newToken);
    localStorage.setItem("mp-user", JSON.stringify(userData));
    
    setToken(newToken);
    setUser(userData);
  };

  // Logout: clear both
  const logout = () => {
    localStorage.removeItem("mp-access-token");
    localStorage.removeItem("mp-user")
    setToken(null);
    setUser(null);

    navigate('/login')
  };

  // Optional: derived state
  const isAuthenticated = !!token;

  const value = {
    token,
    login,
    logout,
    isAuthenticated,
    user,
    setUser
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
