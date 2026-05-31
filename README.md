# Cerebro - Local RAG Chatbot

Cerebro is a modern, responsive, and fully local Retrieval-Augmented Generation (RAG) chatbot. It enables you to chat with your local documents (PDFs, text files, and YouTube transcripts) with source citations. Cerebro is powered by local LLM inference via Ollama and manages your conversation history persistently.

---

## 🚀 Features

- **Persisted Chat History**: Full thread management including creating, renaming, and deleting conversations (stored in SQLite).
- **Hero Mode Interface**: A clean, distraction-free startup screen for new threads, transitioning to a full chat workspace upon the first prompt.
- **Local RAG Integration**: Upload documents and query them locally. Context is automatically extracted and injected into the prompts.
- **Supported Sources**:
  - **PDF Documents** (`.pdf`)
  - **Text Files** (`.txt`)
  - **YouTube Video Transcripts** (dynamic extraction via video URL)
- **Source Attributions**: Chat responses include interactive citations linking back to original document segments or video timestamps.
- **Collapsible Sidebar**: Simple panel controls to toggle recent threads and knowledge base files.
- **100% Local and Private**: All processing happens on your machine using Ollama and local databases (ChromaDB + SQLite).

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite

### Backend
- **Framework**: FastAPI (Python)
- **RAG Orchestration**: LangChain
- **Embeddings Model**: HuggingFace `all-MiniLM-L6-v2`
- **Vector Database**: Chroma DB (local persistent storage)
- **Relational Database**: SQLite (chat threads, history, and source metadata)
- **Inference Engine**: Ollama (configured for `qwen2.5:7b` or similar)

---

## 📂 Project Structure

```text
├── backend/
│   ├── rag/                    # RAG pipelines (loader, vectorstore, LLM wrapper)
│   │   ├── document_loader.py  # File & YouTube transcript processors
│   │   ├── llm.py              # Ollama chat integration & prompts
│   │   ├── retrieval.py        # Document search
│   │   └── vectorstore.py      # Chroma DB configuration & chunking
│   ├── database.py             # SQLite setup and helpers
│   ├── main.py                 # FastAPI endpoints & startup events
│   ├── requirements.txt        # Python dependency manifest
│   └── cerebro.db              # SQLite chat database (auto-generated, git-ignored)
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI parts (Sidebar, Chat, Upload)
│   │   ├── App.jsx             # Root layout & page transition manager
│   │   ├── index.css           # Global styles and tailwind config
│   │   └── main.jsx
│   ├── package.json            # Node.js dependencies
│   └── vite.config.js          # Vite config & dev server settings
│
├── start_servers.bat           # Windows automation script to run both servers
└── .gitignore                  # Git patterns configuration
```

---

## ⚙️ Setup and Installation

### 1. Prerequisites
- **Python**: Version 3.10 or higher
- **Node.js**: LTS version (includes `npm`)
- **Ollama**: Installed and running on your local system

### 2. Ollama Setup
Pull the default model used by the application (`qwen2.5:7b` or adjust model name in `backend/main.py`):
```bash
ollama pull qwen2.5:7b
```

### 3. Backend Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 4. Frontend Setup
1. Navigate to the `frontend` folder:
   ```bash
   cd ../frontend
   ```
2. Install npm modules:
   ```bash
   npm install
   ```

---

## 🏃 Running the Application

### Windows (Quick Start)
Simply double-click the `start_servers.bat` script in the root directory. This will start the FastAPI backend and the Vite frontend dev server in separate console windows.

### Manual Command Line Start
- **Start FastAPI Backend**:
  ```bash
  cd backend
  # Ensure venv is active
  uvicorn main:app --reload
  ```
- **Start Vite Frontend**:
  ```bash
  cd frontend
  npm run dev
  ```

Once both servers are running, open your browser and navigate to **`http://localhost:5173/`**.
