
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" &&
      path.extname(file.originalname).toLowerCase() === ".pdf";

    if (isPdf) {
      cb(null, true);
    } else {
      cb(new Error("Please upload a PDF resume only."));
    }
  }
});

app.get("/", (req, res) => {
  res.send("AI Resume Analyzer backend is running!");
});

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Backend is healthy." });
});

app.post("/analyze", upload.single("resume"), async (req, res) => {
  let uploadedFile;

  try {
    uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: "Please upload your resume in PDF format."
      });
    }

    const jobDescription = (req.body.jobDescription || "").trim();

    if (jobDescription.length < 20) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid job description of at least 20 characters."
      });
    }

    
const dataBuffer = fs.readFileSync(uploadedFile.path);
const data = await pdfParse(dataBuffer);
const resumeText = (data.text || "").trim();

console.log("Extracted PDF text length:", resumeText.length);
console.log("Extracted PDF text preview:", resumeText.slice(0, 300));


    if (resumeText.length < 50) {
      return res.status(400).json({
        success: false,
        message:
          "We could not extract enough text from this PDF. Please try a text-based PDF resume."
      });
    }

    const prompt = `
You are a careful resume-to-job-description matching assistant.

Analyze the resume against the job description using only the supplied text.
Do not invent qualifications, experience, projects, or skills.

JOB DESCRIPTION:
${jobDescription.slice(0, 6000)}

RESUME:
${resumeText.slice(0, 10000)}


STRICT ACCURACY AND CONSISTENCY RULES:

1. Use only evidence found in the uploaded resume.
2. Never assume a programming language or technology from a
   project's name. Check the actual project description.
3. Distinguish explicitly listed skills from skills demonstrated
   through projects.
4. Do not classify the same requirement as both confirmed and missing.
5. For every confirmed skill, provide specific resume evidence.
6. Skills that are inferred or unverified must not increase the score.
7. Mark unsupported requirements as "Not demonstrated in resume".
8. Do not invent experience, achievements, qualifications, or skills.
9. Make the overall match score consistent with the individual
   requirement assessments.
10. Recommend learning a missing skill rather than falsely claiming
    the candidate already has it.
11. If the uploaded file is a research paper instead of a resume,
    warn the user that the score may be unreliable.

FINAL VALIDATION BEFORE RESPONDING:

- Review the entire analysis for contradictions.
- If a skill is explicitly listed, do not call it unverified
  elsewhere unless the job requires a deeper level of proficiency.
- If a project demonstrates a technology, cite that project as
  evidence and use a consistent status throughout the report.
- Distinguish basic knowledge from practical project experience.
- Do not award full credit for a skill merely because it is listed.
- Calculate the match percentage using weighted job requirements.
  Show the total supported points and maximum possible points.
- Do not invent evidence, experience, or achievements.
- Do not recommend claiming proficiency unless the resume supports it.
- Keep recommendations relevant to the actual missing requirements.
FINAL REPORT RULES:

- Separate skills listed in the resume from skills demonstrated
  through projects.
- A listed skill confirms that it is claimed by the candidate,
  not that practical proficiency has been proven.
- Never infer Spring Boot experience from Node.js/Express APIs.
- Never infer DSA application from a project unless the resume
  provides evidence of specific DSA techniques.
- Keep every requirement's status consistent throughout the report.
- For each requirement, show the resume evidence supporting its status.
- Calculate the score using weighted requirements and show the
  points earned and total possible points.
- Do not invent skills, experience, qualifications, or achievements.
- Do not recommend claiming skills the candidate does not possess.
FINAL EVIDENCE CHECK:

- REST API experience does not prove Spring Boot experience.
- Confirm React if it is explicitly listed or demonstrated in a
  project. Do not require "deep understanding" when the job asks
  only for basic knowledge.
- Identify the programming language of each project from its
  description. Never assume all projects use Java.
- A project does not prove collaboration unless teamwork is stated.
- Separate "skill listed" from "practical experience demonstrated".
- Do not count job eligibility statements as candidate qualifications
  unless the resume supports them.
- Calculate the score from individual weighted requirements.
  Show each requirement's weight and earned points.
- Verify all statuses and the score before producing the final report.
SCORING VALIDATION:
- Use one consistent scoring scale throughout the report.
- If using weighted points, ensure the earned points and maximum
  possible points are calculated correctly.
- Calculate the percentage as:
  (total earned points / total possible points) * 100.
- Round the final percentage to the nearest whole number.
- Clearly distinguish point weights from percentage weights.
- Never count a skill twice across overlapping requirements.
- Ensure every score matches the evidence and status provided.
`;

const aiResponse = await groq.chat.completions.create({
  model: "openai/gpt-oss-120b",
  messages: [
    {
      role: "user",
      content: prompt,
    },
  ],
  temperature: 0.1,
  max_completion_tokens: 1800,
});

const analysisText =
  aiResponse.choices?.[0]?.message?.content?.trim();
    if (!analysisText) {
      throw new Error("The AI returned an empty response. Please try again.");
    }

    res.json({
      success: true,
      message: "Resume analyzed successfully!",
      analysis: analysisText
    });
  } catch (error) {
    console.error("Analysis error:", error.message);

    if (res.headersSent) return;

    const isUploadError = error instanceof multer.MulterError;

    res.status(isUploadError ? 400 : 500).json({
      success: false,
      message: isUploadError
        ? error.code === "LIMIT_FILE_SIZE"
          ? "The PDF is too large. Please upload a resume under 5 MB."
          : error.message
        : error.message || "Something went wrong while analyzing the resume."
    });
  } finally {
    if (uploadedFile?.path) {
      fs.promises.unlink(uploadedFile.path).catch(() => {});
    }
  }
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  res.status(400).json({
    success: false,
    message: err.message || "The uploaded file could not be processed."
  });
});
 app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

