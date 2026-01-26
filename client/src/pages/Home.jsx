import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import "../styles/Home.css";

const Home = () => {
  const { user, logout } = useContext(AuthContext);

  const [resume, setResume] = useState(null);
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!resume || (!jdText && !jdFile)) {
      setError("Please provide resume and job description");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resume);
    if (jdText) formData.append("jdText", jdText);
    if (jdFile) formData.append("jdFile", jdFile);

    try {
      setLoading(true);
      const res = await api.post("/analysis/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const getScoreClass = (score) => {
    if (score > 70) return "progress-good";
    if (score > 40) return "progress-mid";
    return "progress-bad";
  };

  return (
    <div className="home-container">
      <h2>HireScope – Resume Analyzer 🎯</h2>
      <p>Logged in as <b>{user.email}</b></p>

      <hr />

      {/* INPUT FORM */}
      <form onSubmit={handleAnalyze}>
        <label><b>Upload Resume</b></label><br />
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setResume(e.target.files[0])}
        />

        <br /><br />

        <label><b>Job Description (Text)</b></label><br />
        <textarea
          rows="5"
          placeholder="Paste job description here"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          style={{ width: "100%" }}
        />

        <br /><br />

        <label><b>OR Upload JD File</b></label><br />
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setJdFile(e.target.files[0])}
        />

        <br /><br />

        <button type="submit" disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Resume"}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {/* RESULTS */}
      {result && (
        <div className="section-card">
          <h3>ATS Compatibility Score</h3>

          <div className="progress-bar">
            <div
              className={`progress-fill ${getScoreClass(result.atsScore)}`}
              style={{ width: `${result.atsScore}%` }}
            >
              {result.atsScore}%
            </div>
          </div>

          <h4>✅ Matched Skills</h4>
          {result.matchedSkills.length === 0 ? (
            <p>No matching skills found</p>
          ) : (
            result.matchedSkills.map((skill) => (
              <span key={skill} className="skill-chip skill-match">
                {skill}
              </span>
            ))
          )}

          <h4 style={{ marginTop: "15px" }}>❌ Missing Skills</h4>
          {result.missingSkills.length === 0 ? (
            <p>No missing skills 🎉</p>
          ) : (
            result.missingSkills.map((skill) => (
              <span key={skill} className="skill-chip skill-missing">
                {skill}
              </span>
            ))
          )}
        </div>
      )}

      <button className="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

export default Home;
