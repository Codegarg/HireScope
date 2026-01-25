import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";

const Home = () => {
  const { user, logout } = useContext(AuthContext);
  const [resume, setResume] = useState(null);
  const [jd, setJd] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!resume || !jd) {
      alert("Please upload resume and paste job description");
      return;
    }
    // Day 3 will handle actual upload + analysis
    alert("Resume and JD submitted (UI complete)");
  };

  return (
    <div style={{ maxWidth: 700, margin: "80px auto" }}>
      <h2>Welcome to HireScope 🎯</h2>
      <p>Logged in as <b>{user.email}</b></p>

      <hr />

      <form onSubmit={handleSubmit}>
        <div>
          <label><b>Upload Resume (PDF)</b></label><br />
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setResume(e.target.files[0])}
          />
        </div>

        <br />

        <div>
          <label><b>Job Description</b></label><br />
          <textarea
            rows="6"
            style={{ width: "100%" }}
            placeholder="Paste job description here..."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
        </div>

        <br />
        <button type="submit">Submit</button>
      </form>

      <br />
      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default Home;
