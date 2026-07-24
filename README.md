<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=22C08E&height=220&section=header&text=HireScope&fontSize=80&fontColor=ffffff&animation=fadeIn" alt="HireScope Banner" width="100%"/>

  <a href="https://git.io/typing-svg">
    <img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&weight=600&size=24&pause=1000&color=22C08E&center=true&vCenter=true&width=600&lines=Hybrid+ATS+Analyzer+%26+Optimizer;AI-Powered+Career+Intelligence;Cloudflare+Llama-3+Integrated" alt="Typing SVG" />
  </a>

  <p align="center">
    <b>Bridge the gap between candidate resumes and modern Applicant Tracking Systems.</b>
  </p>

  <div>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/Llama_3-0668E1?style=for-the-badge&logo=meta&logoColor=white" alt="Meta Llama 3" />
    <img src="https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare" />
  </div>
</div>

<br/>

HireScope is an AI-powered Hybrid ATS Analyzer and Career Intelligence platform designed to bridge the gap between candidate resumes and modern Applicant Tracking Systems. By combining deterministic rule-based analysis with advanced large language models, HireScope provides high-precision scoring and surgical resume optimization.

---

## 🚀 The Hybrid Engine Advantage

Traditional ATS scanners often rely on simple keyword matching, leading to high false-negative rates. HireScope utilizes a **70/30 Hybrid Scoring Architecture**:

- ⚙️ **Rule-Based Analysis (70%)**: Deterministic checks for structural integrity, contact information validation, experience years calculation, and exact keyword matching. This ensures baseline ATS compliance.
- 🧠 **LLM-Powered Intelligence (30%)**: Semantic similarity matching, role alignment scoring, and contextual skill detection using **Llama 3**. This captures the "intent" and "quality" of experience that simple scanners miss.

## 🏗️ System Architecture

GitHub natively renders this architecture flow!

```mermaid
graph TD
    Client["💻 Client (React + Vite)"] <--> |REST API| Server["⚙️ Server (Express.js)"]
    
    subgraph Backend Services
        Server --> ATS["🧠 Hybrid ATS Engine\n(70% Rule-Based)"]
        Server --> AI["🤖 AI Service\n(Llama 3 via Cloudflare)"]
        Server --> DB["🗄️ Persistence\n(MongoDB)"]
    end
    
    ATS -.-> |Rule Validation| AI
    AI -.-> |Semantic Scoring| ATS
```

## ✨ Core Features

* 📄 **Intelligent Resume Parsing**: Support for PDF and DOCX formats with advanced text extraction.
* 📊 **Deep ATS Analytics**: Actionable UI showing Score Deltas, Knockout Factors, Missing Critical Skills, and detailed formatting alerts.
* 🪄 **Magic Improve (Dual-Mode Optimization)**:
  * **Optimize Content (Structured)**: Surgical updates that preserve your original resume structure and headers while improving wording and keyword density.
  * **Regenerate Resume (Experimental)**: Full AI-powered rewrite for radical JD alignment (best for significant career pivots).
* 🛡️ **Structured Validation**: Defensive layers that prevent the AI from fabricating experience or altering document structure during enhancement.

## 📈 ATS Scoring Breakdown

| Component | Weight | Description |
| :--- | :---: | :--- |
| **Experience Mastery** | 20% | Validation of years of experience against JD requirements. |
| **Core Skill Match** | 15% | Direct keyword matching of essential technical skills. |
| **Semantic Alignment** | 15% | Contextual similarity between resume bullets and JD responsibilities. |
| **Contact Integrity** | 10% | Verification of essential contact details (Email, Phone, LinkedIn). |
| **Skill Density** | 10% | Overall ratio of relevant industry keywords. |
| **Structural Health** | 10% | ATS-friendly formatting and section header identification. |
| **Summary Impact** | 10% | Qualitative analysis of the professional profile. |
| **Risk Assessment** | 10% | Identification of gaps, weak verbs, or missing quantification. |

<br/>

## 🛠️ Getting Started

<details>
<summary><b>Click to expand setup instructions</b></summary>

### Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas or local instance
- Cloudflare AI API access (or configured Llama 3 provider)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/Codegarg/HireScope.git
cd HireScope
```

### 2. Backend Setup

```bash
cd server
npm install
```
Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

### 3. Frontend Setup

```bash
cd ../client
npm install
```
Create a `.env` file in the `client` directory:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 4. Running Locally

You'll need two terminals to run the app:

**Terminal 1 (Backend)**:
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend)**:
```bash
cd client
npm run dev
```
</details>

## 📡 API Overview (AI Improvement)

```http
POST /api/resumes/:id/improve
```

<details>
<summary><b>View API Payload & Response</b></summary>

### Request
```json
{
  "resumeText": "...",
  "jobDescription": "...",
  "mode": "structured",
  "previousScore": 72
}
```

### Response
```json
{
  "success": true,
  "optimizedResume": "...",
  "improvementSummary": [
    "Replaced 'Worked on' with 'Spearheaded' in Experience section",
    "Quantified project impact by 25% efficiency increase",
    "Inserted 'Kubernetes' into Technical Skills"
  ],
  "newScore": 88,
  "scoreDelta": 16,
  "llmFallback": false
}
```
</details>

## 🗺️ Roadmap

- [ ] Interactive Resume Heatmaps for Skill Density
- [ ] Multi-document Resume Comparison
- [ ] Automated Cover Letter Generator based on ATS Scores
- [ ] Browser Extension for direct LinkedIn job analysis

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**[Ridham Garg](https://github.com/Codegarg)**
*Founder / Lead Architect*

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=22C08E&height=100&section=footer" alt="Footer Banner" width="100%"/>
</div>