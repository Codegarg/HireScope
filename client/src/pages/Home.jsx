import { useState, useRef, useEffect } from "react";
import { analyzeResume, sendChatMessage } from "../services/api";
import "../styles/Home.css";

const Home = () => {
  const [resume, setResume] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "ai", content: "Hi! I'm your HireScope Assistant. Once you analyze your resume, I can help you with interview prep or improvements." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAnalyze = async () => {
    setError("");
    setResult(null);

    if (!resume) {
      setError("Please upload a resume file.");
      return;
    }

    if (!jdText && !jdFile) {
      setError("Please provide a Job Description (paste text or upload file).");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resume);
    if (jdFile) formData.append("jd", jdFile);
    if (jdText) formData.append("jdText", jdText);

    try {
      setLoading(true);
      const res = await analyzeResume(formData);
      setResult(res.data.data);
      setShowChat(true); // Open chat automatically after analysis
    } catch (err) {
      setError(err.response?.data?.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);

    try {
      setChatLoading(true);
      const res = await sendChatMessage(userMsg, {
        resumeText: result?.resumeText,
        jdText: result?.jdText,
        atsResult: result
      });
      setMessages(prev => [...prev, { role: "ai", content: res.data.data }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="container">
      <header style={{ textAlign: "center", marginBottom: "60px" }}>
        <h1 className="gradient-text" style={{ fontSize: "3.5rem", margin: "0" }}>HireScope</h1>
        <p style={{ color: "#94a3b8", fontSize: "1.2rem" }}>Precision ATS Analysis & AI Career Guidance</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr", gap: "40px" }}>

        {/* Left: Input Section */}
        <div className="glass-card">
          <h2 style={{ marginTop: 0 }}>Analyze Your Fit</h2>

          <div className="input-group">
            <label className="input-label">Resume (PDF, DOCX)</label>
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={(e) => setResume(e.target.files[0])}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Job Description (Paste text)</label>
            <textarea
              rows="8"
              placeholder="Paste the job description here..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">OR Upload JD File (PDF, DOCX, TXT)</label>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={(e) => setJdFile(e.target.files[0])}
            />
          </div>

          <button className="btn-primary" onClick={handleAnalyze} disabled={loading}>
            {loading ? "Analyzing Core Content..." : "Run ATS Analysis"}
          </button>

          {error && <p style={{ color: "#f87171", marginTop: "16px" }}>{error}</p>}
        </div>

        {/* Right: Results Section */}
        {result && (
          <div className="glass-card" style={{ animation: "fadeIn 0.5s ease-out" }}>
            <h2 style={{ marginTop: 0 }}>Analysis Results</h2>

            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <div className="score-circle">
                {result.atsScore}%
              </div>
              <div>
                <p style={{ fontSize: "1.2rem", fontWeight: "600", margin: 0 }}>ATS Score</p>
                <p style={{ color: "#94a3b8", margin: 0 }}>Based on skills & structure</p>
              </div>
            </div>

            <div style={{ marginTop: "32px" }}>
              <h3 className="input-label">Matched Skills</h3>
              <div style={{ flexWrap: "wrap", display: "flex" }}>
                {result.matchedSkills.length > 0 ? (
                  result.matchedSkills.map(skill => (
                    <span key={skill} className="skill-tag skill-matched">{skill}</span>
                  ))
                ) : <span style={{ color: "#94a3b8" }}>No direct matches found.</span>}
              </div>
            </div>

            <div style={{ marginTop: "24px" }}>
              <h3 className="input-label">Missing Skills</h3>
              <div style={{ flexWrap: "wrap", display: "flex" }}>
                {result.missingSkills.length > 0 ? (
                  result.missingSkills.map(skill => (
                    <span key={skill} className="skill-tag skill-missing">{skill}</span>
                  ))
                ) : <span style={{ color: "#4ade80" }}>Perfect skill match!</span>}
              </div>
            </div>

            <div style={{ marginTop: "32px", borderTop: "1px solid var(--glass-border)", paddingTop: "24px" }}>
              <h3 className="gradient-text">AI Resume Suggestions</h3>
              <div style={{
                background: "rgba(0,0,0,0.2)",
                padding: "20px",
                borderRadius: "16px",
                lineHeight: "1.6",
                fontSize: "0.95rem",
                whiteSpace: "pre-wrap"
              }}>
                {result.aiSuggestions}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Assistant */}
      {showChat && (
        <div className="chat-container">
          <div className="chat-box">
            <div className="chat-header">
              Career Assistant Chat
            </div>
            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`message message-${m.role}`}>
                  {m.content}
                </div>
              ))}
              {chatLoading && <div className="message message-ai">Analyzing...</div>}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input">
              <input
                type="text"
                placeholder="Ask about your resume..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                className="btn-primary"
                style={{ width: "auto", padding: "8px 16px" }}
                onClick={handleSendMessage}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Home;
