import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ResumeEditor from "./pages/ResumeEditor";

const RoutesConfig = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div style={{ color: "white", textAlign: "center", marginTop: "100px" }}>Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />

      {/* Protected Routes */}
      <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/editor/:id" element={user ? <ResumeEditor /> : <Navigate to="/login" />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
    </Routes>
  );
};

export default RoutesConfig;
