# Unified Knowledge Platform (UKP)

## Overview

The Unified Knowledge Platform (UKP) is an AI-powered web application that enables users to interact with internal knowledge sources (such as legal documents and parliamentary rules) using natural language. It leverages Retrieval-Augmented Generation (RAG) with Google Gemini LLM and LangChain to provide context-aware, source-cited answers, and allows users to view referenced PDF documents directly in the browser.

---

## Architecture

- **Frontend:** React.js SPA (Single Page Application)
  - Chat interface with session management
  - Agent selection for specialized knowledge (e.g., DPDP Act, Parliament Rules)
  - PDF viewing and highlighting
  - Voice input/output (speech recognition and synthesis)
- **Backend:** Python Flask API
  - Session and message management
  - RAG pipeline using LangChain, Gemini LLM, and FAISS vector store
  - PDF document serving and page mapping
  - Prompt engineering for context-aware, well-formatted responses

---

## Environment Setup

### Prerequisites
- **Python 3.9+** (recommended: 3.10 or above)
- **Node.js 16+** and **npm** (for frontend)
- **pip** (Python package manager)
- **git** (for cloning the repository)

### Backend Environment
1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd EY_RAG_Project
   ```
2. **(Recommended) Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   cd backend
   pip install -r requirements.txt
   ```
4. **Environment Variables:**
   - Create a `.env` file in the root or backend directory with the following (example):
     ```env
     FLASK_SECRET_KEY=your_secret_key_here
     GOOGLE_API_KEY=your_google_gemini_api_key
     MAX_CONVERSATION_HISTORY=10
     ```
   - The backend will also look for the Google API key in the environment or directly in the code (for local testing).
5. **PDF Documents:**
   - Place your PDF files in `backend/pdfs/`.
   - Example: `backend/pdfs/DPDP_act.pdf`, `backend/pdfs/Rules_of_Procedures_Lok_Sabha.pdf`

### Frontend Environment
1. **Install Node.js dependencies:**
   ```bash
   cd react-frontend
   npm install
   ```
2. **Environment Variables (Optional):**
   - If you need to customize the backend URL, create a `.env` file in `react-frontend/`:
     ```env
     REACT_APP_BACKEND_URL=http://localhost:5000
     ```
3. **Start the React app:**
   ```bash
   npm start
   ```
4. **Access the app:**
   - Open [http://localhost:3000](http://localhost:3000) in your browser.

### Troubleshooting & Common Issues
- **CORS errors:** Ensure both backend and frontend are running on the correct ports and CORS is enabled in Flask.
- **PDFs not loading:** Check that PDFs are present in `backend/pdfs/` and filenames match those referenced in the frontend agent definitions.
- **API key issues:** Make sure your Google Gemini API key is valid and set in the environment or `.env` file.
- **Port conflicts:** Default ports are 5000 (backend) and 3000 (frontend). Change if needed.
- **Virtual environment not activating:** On Windows, use `venv\Scripts\activate` instead of `source venv/bin/activate`.

---

## Directory Structure

```
EY_RAG_Project/
├── backend/                  # Backend Python modules and data
│   ├── pdfs/                 # Source PDF documents
│   ├── faiss_index/          # FAISS vector index files
│   ├── chroma_db/            # Chroma DB (if used)
│   ├── pdf_utils.py          # PDF handling utilities
│   ├── RAGPipeline.py        # RAG pipeline logic
│   ├── utils.py              # FAISS index helpers
│   ├── requirements.txt      # Backend dependencies
│   └── ...
├── react-frontend/           # React frontend app
│   ├── src/
│   │   ├── App.js            # Main React app
│   │   ├── components/
│   │   │   └── PDFViewer.js  # PDF viewing component
│   │   └── ...
│   └── public/
├── prompts.py                # Prompt templates and instructions
├── backend.py                # Main Flask backend server
├── README.md                 # Project documentation (this file)
├── requirements.txt          # Top-level Python dependencies
└── ...
```

---

## Backend Documentation

### Main Server (`backend.py`)
- **Framework:** Flask
- **Key Features:**
  - Session management (create, update, delete, list sessions)
  - Message handling (add, retrieve messages per session)
  - RAG pipeline: retrieves relevant PDF content using FAISS and LangChain, then generates answers with Gemini LLM
  - PDF serving: serves PDF files and supports page/section navigation
  - CORS enabled for frontend-backend communication
  - Logging and error handling for robust operation

#### API Endpoints
- `GET /sessions` — List all chat sessions
- `POST /sessions` — Create a new session
- `DELETE /sessions/<session_id>` — Delete a session
- `PUT /sessions/<session_id>` — Update session title
- `GET /sessions/<session_id>/messages` — Get all messages for a session
- `POST /sessions/<session_id>/messages` — Add a user message, trigger RAG pipeline, and return assistant response
- `GET /pdfs/<filename>` — Serve a PDF file (supports page and section query params)

#### RAG Pipeline
- Loads all PDFs from `backend/pdfs/` and indexes them with FAISS using Google Embeddings
- On user query:
  - Retrieves relevant document chunks
  - Constructs a context-aware prompt (using `prompts.py`)
  - Invokes Gemini LLM for answer generation
  - Formats the response with source links (pdf://...)

#### Prompt Engineering (`prompts.py`)
- Contains detailed instruction templates for various query types:
  - Core, detailed, comparison, summarization, extraction, analysis, technical, definition, example, translation, clarification, general
  - Specialized instructions for DPDP Act and Parliament Procedures agents
  - Formatting and source citation rules
- Exposes a helper to generate PDF source links

#### PDF Serving
- Serves PDFs from `backend/pdfs/`
- Supports logical-to-physical page mapping
- Adds CORS and custom headers for page/section navigation

#### Session Storage
- Sessions and messages are stored in-memory and persisted to `sessions.json`

---

## Frontend Documentation

### Main App (`react-frontend/src/App.js`)
- **Features:**
  - Multi-session chat interface with history
  - Agent selection (e.g., DPDP, Parliament) for specialized queries
  - Markdown rendering with custom PDF link handling
  - Voice input (speech recognition) and output (speech synthesis)
  - PDF viewing (via `PDFViewer.js`)
  - Theme switching (light/dark)
  - User profile (avatar, name)

#### PDF Viewing (`PDFViewer.js`)
- Renders PDF documents using `pdfjs-dist`
- Supports page navigation, zoom, and text highlighting
- Integrates with chat to open referenced documents/pages

#### Agent System
- Users can mention agents (e.g., `@DPDP`) for targeted queries
- Each agent is mapped to a specific knowledge source (PDF)
- Agent selection can be sticky per session

#### Data Flow
- User sends a message (optionally mentioning an agent)
- Frontend POSTs to backend `/sessions/<id>/messages`
- Backend retrieves context, generates answer, and returns response with source links
- Frontend renders answer, parses PDF links, and enables PDF viewing

---

## How to Run

### Backend
1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   cd backend
   pip install -r requirements.txt
   ```
2. Place your PDF documents in `backend/pdfs/`
3. Start the backend server:
   ```bash
   python backend.py
   ```

### Frontend
1. Install Node.js dependencies:
   ```bash
   cd react-frontend
   npm install
   ```
2. Start the React app:
   ```bash
   npm start
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser

---

## Extending the Platform

- **Add new knowledge sources:** Place new PDFs in `backend/pdfs/` and update agent definitions in the frontend.
- **Add new agents:** Update agent list in `KnowledgeSourcesView` and map to the relevant PDF.
- **Customize prompts:** Edit `prompts.py` to refine response style, formatting, or add new instructions.
- **Improve RAG pipeline:** Extend `backend/RAGPipeline.py` and `backend/utils.py` for advanced retrieval or chunking logic.

---

## Existing Documentation
- See the `docs/` directory for API reference, architecture diagrams, error handling, and FAQs.

---

## Credits
- Built with Flask, React, LangChain, Google Gemini, FAISS, and pdfjs-dist.
- Developed by Dhruv Mendiratta and contributors.
