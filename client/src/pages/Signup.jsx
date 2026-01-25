import { useState } from "react";
import api from "../services/api";
import { useNavigate, Link } from "react-router-dom";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/signup", { email, password });
      navigate("/login");
    } catch (err) {
      setError(err?.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "120px auto" }}>
      <h2>Signup</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br /><br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br /><br />
        <button type="submit">Create Account</button>
      </form>

      <hr style={{ margin: "20px 0" }} />

      {/* OAuth = Signup OR Login */}
      <a href="http://localhost:5000/auth/google">
        <button style={{ width: "100%", marginBottom: 8 }}>
          Continue with Google
        </button>
      </a>

      <a href="http://localhost:5000/auth/github">
        <button style={{ width: "100%" }}>
          Continue with GitHub
        </button>
      </a>

      <p style={{ marginTop: 16 }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default Signup;
