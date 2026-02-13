import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ResumeEditor from "./pages/ResumeEditor";
// NEW IMPORTS
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const RoutesConfig = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div style={{ color: "white", textAlign: "center", marginTop: "100px" }}>Loading...</div>;

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
      
      {/* NEW: Password Recovery Routes (Public) */}
      <Route 
        path="/forgot-password" 
        element={!user ? <ForgotPassword /> : <Navigate to="/" />} 
      />
      <Route 
        path="/reset-password/:token" 
        element={!user ? <ResetPassword /> : <Navigate to="/" />} 
      />

      {/* Main App Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/editor/:id" element={user ? <ResumeEditor /> : <Navigate to="/login" />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
    </Routes>
  );
};

export default RoutesConfig;