import { useState } from "react";
import { analyzeResume } from "../services/api";

const Home = () => {
  const [resume, setResume] = useState(null);
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setError("");
    setResult(null);

    if (!resume || !jdText) {
      setError("Resume file and Job Description are required");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resume);
    formData.append("jdText", jdText);

    try {
      setLoading(true);
      const res = await analyzeResume(formData);
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", color: "white" }}>
      <h1>HireScope – ATS Analyzer</h1>

      {/* Resume Upload */}
      <div>
        <label>Upload Resume (PDF)</label>
        <br />
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setResume(e.target.files[0])}
        />
      </div>

      {/* Job Description */}
      <div style={{ marginTop: "20px" }}>
        <label>Job Description</label>
        <br />
        <textarea
          rows="6"
          style={{ width: "100%" }}
          placeholder="Paste job description here..."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
        />
      </div>

      {/* Analyze Button */}
      <div style={{ marginTop: "20px" }}>
        <button onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Resume"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: "red", marginTop: "20px" }}>{error}</p>
      )}

      {/* ATS Result */}
      {result && (
        <div style={{ marginTop: "30px" }}>
          <h2>ATS Score: {result.atsScore}</h2>

          <h3>Matched Skills</h3>
          <ul>
            {result.matchedSkills.map((skill) => (
              <li key={skill} style={{ color: "lightgreen" }}>
                {skill}
              </li>
            ))}
          </ul>

          <h3>Missing Skills</h3>
          <ul>
            {result.missingSkills.map((skill) => (
              <li key={skill} style={{ color: "salmon" }}>
                {skill}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Home;
