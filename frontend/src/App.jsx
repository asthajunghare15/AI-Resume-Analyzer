import remarkGfm from "remark-gfm";
import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [matchScore, setMatchScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async (event) => {
    event.preventDefault();

    if (!resume) {
      setError("Please upload your resume in PDF format.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please enter the job description.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis("");
    setMatchScore(null);

    try {
      const formData = new FormData();
      formData.append("resume", resume);
      formData.append("jobDescription", jobDescription);

      const response = await axios.post(
        "http://localhost:5000/analyze",
        formData
      );

      const result = response.data.analysis || "";
      setAnalysis(result);

      const score = result.match(
        /Overall Match Percentage:\s*\**\s*(\d{1,3})\s*%?/i
      );

      if (score) {
        setMatchScore(Math.min(100, Number(score[1])));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not analyze the resume. Check that your backend is running and your Groq API key is configured correctly, then try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResume(null);
    setJobDescription("");
    setAnalysis("");
    setMatchScore(null);
    setError("");

    const fileInput = document.getElementById("resume");
    if (fileInput) fileInput.value = "";
  };

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#">
          <span className="brand-icon">R</span>
          <span>Resume<span className="brand-accent">IQ</span></span>
        </a>
        <span className="nav-label">AI-POWERED CAREER TOOL</span>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="eyebrow">
            <span className="status-dot"></span>
            YOUR PERSONAL AI CAREER ASSISTANT
          </div>

          <h1>
            Make your resume
            <br />
            <span>stand out.</span>
          </h1>

          <p className="hero-description">
            Compare your resume with a job description, discover skill gaps,
            and get actionable suggestions to improve your application.
          </p>
        </section>

        <form className="analyzer-card" onSubmit={handleAnalyze}>
          <div className="section-heading">
            <div>
              <span className="step-label">STEP 01</span>
              <h2>Upload your resume</h2>
            </div>
            <span className="file-badge">PDF ONLY · MAX 5 MB</span>
          </div>

          <label className="upload-box" htmlFor="resume">
            <input
              id="resume"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (!file) {
                  setResume(null);
                  return;
                }

                if (
                  file.type !== "application/pdf" ||
                  !file.name.toLowerCase().endsWith(".pdf")
                ) {
                  setResume(null);
                  event.target.value = "";
                  setError("Please select a valid PDF file.");
                  return;
                }

                if (file.size > 5 * 1024 * 1024) {
                  setResume(null);
                  event.target.value = "";
                  setError("Your PDF must be smaller than 5 MB.");
                  return;
                }

                setResume(file);
                setError("");
              }}
            />

            <span className="upload-icon">↑</span>

            {resume ? (
              <>
                <strong>{resume.name}</strong>
                <span>
                  {(resume.size / (1024 * 1024)).toFixed(2)} MB · Ready to
                  analyze
                </span>
              </>
            ) : (
              <>
                <strong>Drop your resume here or browse files</strong>
                <span>Upload your resume as a PDF document</span>
              </>
            )}
          </label>

          <div className="section-heading job-heading">
            <div>
              <span className="step-label">STEP 02</span>
              <h2>Paste the job description</h2>
            </div>
          </div>

          <textarea
            className="job-input"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste the job requirements here...&#10;&#10;Example: Java, OOP, DSA, SQL, Spring Boot, REST APIs..."
            rows={7}
          />

          <div className="input-footer">
            <span>Be specific for a more useful comparison.</span>
            <span>{jobDescription.length} characters</span>
          </div>

          {error && (
            <div className="error-message" role="alert">
              <span>!</span>
              {error}
            </div>
          )}

          <button
            className="analyze-button"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Analyzing your resume...
              </>
            ) : (
              <>
                Analyze my resume <span>→</span>
              </>
            )}
          </button>

          <p className="privacy-note">
            Your analysis runs through your configured local AI backend.
          </p>
        </form>

        {loading && (
          <div className="loading-card" aria-live="polite">
            <span className="large-spinner"></span>
            <h3>Analyzing your resume</h3>
            <p>
              Extracting text and comparing your experience with the job
              requirements. This may take a little while.
            </p>
          </div>
        )}

        {analysis && !loading && (
          <section className="results-section">
            <div className="results-heading">
              <div>
                <span className="step-label">YOUR RESULTS</span>
                <h2>Resume analysis</h2>
              </div>

              <button
                className="reset-button"
                type="button"
                onClick={handleReset}
              >
                New analysis ↗
              </button>
            </div>

            {matchScore !== null && (
              <div className="score-card">
                <div
                  className="score-ring"
                  style={{
                    "--score-angle": `${matchScore * 3.6}deg`,
                  }}
                >
                  <div className="score-inner">
                    <strong>{matchScore}%</strong>
                    <span>MATCH</span>
                  </div>
                </div>

                <div className="score-copy">
                  <h3>Overall match score</h3>
                  <p>
                    This is an AI-generated estimate based on the supplied
                    resume and job description, not a guarantee of hiring
                    suitability.
                  </p>
                </div>
              </div>
            )}

            <article className="analysis-result">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
  {analysis}
</ReactMarkdown>
            </article>

            <button
              className="secondary-button"
              type="button"
              onClick={handleReset}
            >
              Analyze another resume
            </button>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>ResumeIQ · AI Resume Analyzer</span>
        <span>Built with React, Express &amp; Ollama</span>
      </footer>
    </div>
  );
}

export default App;
