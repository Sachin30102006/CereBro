from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import uuid
import asyncio
from datetime import datetime
import urllib.request
import json
import threading

from database import get_db, init_db
from rag.document_loader import process_text, process_pdf, process_youtube
from rag.vectorstore import chunk_text, add_documents_to_store
from rag.llm import stream_chat

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def preload_model():
    try:
        url = "http://localhost:11434/api/generate"
        data = json.dumps({"model": "qwen2.5:7b", "keep_alive": -1}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req)
        print("Preloaded Ollama model successfully.")
    except Exception as e:
        print(f"Failed to preload Ollama model: {e}")

@app.on_event("startup")
def startup_event():
    init_db()
    threading.Thread(target=preload_model, daemon=True).start()

class ChatRequest(BaseModel):
    messages: List[dict]
    model: str = "qwen2.5:7b"
    session_id: Optional[str] = None

async def process_document_bg(doc_id: str, filename: str, content: bytes, source_type: str, youtube_url: str = None):
    try:
        # Update status to processing
        conn = get_db()
        conn.execute("UPDATE documents SET status = 'processing', progress = 10 WHERE doc_id = ?", (doc_id,))
        conn.commit()

        # 1. Extract text
        if source_type == 'youtube':
            text = await process_youtube(youtube_url)
        elif source_type == 'pdf':
            text = await process_pdf(content, filename)
        else:
            text = await process_text(content, filename)
            
        conn.execute("UPDATE documents SET progress = 40 WHERE doc_id = ?", (doc_id,))
        conn.commit()

        # 2. Chunk text
        docs = chunk_text(text, doc_id, source_type, filename)
        
        conn.execute("UPDATE documents SET progress = 70, chunk_count = ? WHERE doc_id = ?", (len(docs), doc_id))
        conn.commit()

        # 3. Add to VectorStore
        if docs:
            add_documents_to_store(docs)

        conn.execute("UPDATE documents SET status = 'completed', progress = 100 WHERE doc_id = ?", (doc_id,))
        conn.commit()
        conn.close()

    except Exception as e:
        print(f"Error processing document {doc_id}: {e}")
        conn = get_db()
        conn.execute("UPDATE documents SET status = 'error', progress = 0 WHERE doc_id = ?", (doc_id,))
        conn.commit()
        conn.close()


@app.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    youtube_url: Optional[str] = Form(None)
):
    doc_id = str(uuid.uuid4())
    conn = get_db()
    
    filename = ""
    source_type = ""
    content = b""

    if file:
        filename = file.filename
        source_type = 'pdf' if file.filename.lower().endswith('.pdf') else 'text'
        content = await file.read()
    elif youtube_url:
        import urllib.request
        import json
        filename = "YouTube Video"
        try:
            oembed_url = f"https://www.youtube.com/oembed?url={youtube_url}&format=json"
            with urllib.request.urlopen(oembed_url) as response:
                data = json.loads(response.read().decode())
                filename = data.get("title", "YouTube Video")
        except Exception as e:
            print(f"oEmbed fetch failed: {e}")
        source_type = 'youtube'
    else:
        return {"error": "No file or youtube URL provided"}

    conn.execute('''
        INSERT INTO documents (doc_id, name, source_type, upload_date, status, progress) 
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (doc_id, filename, source_type, datetime.now(), 'pending', 0))
    conn.commit()
    conn.close()

    background_tasks.add_task(process_document_bg, doc_id, filename, content, source_type, youtube_url)

    return {"doc_id": doc_id, "name": filename}

@app.get("/status/{doc_id}")
async def get_status(doc_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT progress, status FROM documents WHERE doc_id = ?", (doc_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {"progress": row["progress"], "status": row["status"]}
    return {"error": "Document not found"}

@app.get("/documents")
async def get_documents():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT doc_id, name, source_type, status, chunk_count FROM documents ORDER BY upload_date DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{"doc_id": r["doc_id"], "name": r["name"], "source_type": r["source_type"], "status": r["status"], "chunk_count": r["chunk_count"]} for r in rows]

from rag.vectorstore import get_vectorstore

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    conn = get_db()
    conn.execute("DELETE FROM documents WHERE doc_id = ?", (doc_id,))
    conn.commit()
    conn.close()
    
    vectorstore = get_vectorstore()
    try:
        vectorstore._collection.delete(where={"doc_id": doc_id})
    except Exception as e:
        print(f"Error deleting from chroma: {e}")
        
    return {"status": "deleted"}

@app.get("/documents/{doc_id}/chunks")
async def get_document_chunks(doc_id: str):
    vectorstore = get_vectorstore()
    try:
        results = vectorstore._collection.get(where={"doc_id": doc_id})
        return {"chunks": results.get("documents", []), "metadatas": results.get("metadatas", [])}
    except Exception as e:
        return {"error": str(e)}

@app.get("/sessions")
async def get_sessions():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT session_id, title, updated_at FROM chat_sessions ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["session_id"], "title": r["title"], "updated_at": r["updated_at"]} for r in rows]

class SessionCreate(BaseModel):
    title: str

@app.post("/sessions")
async def create_session(data: SessionCreate):
    session_id = str(uuid.uuid4())
    conn = get_db()
    conn.execute(
        "INSERT INTO chat_sessions (session_id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (session_id, data.title, datetime.now(), datetime.now())
    )
    conn.commit()
    conn.close()
    return {"id": session_id, "title": data.title}

@app.put("/sessions/{session_id}")
async def rename_session(session_id: str, data: SessionCreate):
    conn = get_db()
    conn.execute("UPDATE chat_sessions SET title = ? WHERE session_id = ?", (data.title, session_id))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    conn = get_db()
    conn.execute("DELETE FROM message_sources WHERE message_id IN (SELECT message_id FROM chat_history WHERE session_id = ?)", (session_id,))
    conn.execute("DELETE FROM chat_history WHERE session_id = ?", (session_id,))
    conn.execute("DELETE FROM chat_sessions WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@app.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT message_id, role, content FROM chat_history WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
    rows = cursor.fetchall()
    
    messages = []
    for r in rows:
        msg = {"role": r["role"], "content": r["content"], "sources": []}
        if r["role"] == "bot":
            cursor.execute("SELECT type, title, reference FROM message_sources WHERE message_id = ?", (r["message_id"],))
            sources = cursor.fetchall()
            msg["sources"] = [{"type": s["type"], "title": s["title"], "reference": s["reference"]} for s in sources]
        messages.append(msg)
    conn.close()
    return messages

async def stream_chat_and_save(messages: List[dict], model: str, session_id: str):
    conn = get_db()
    user_msg_content = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_msg_content = msg.get("content", "")
            break
            
    user_msg_id = str(uuid.uuid4())
    conn.execute('''
        INSERT INTO chat_history (message_id, session_id, role, content, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_msg_id, session_id, 'user', user_msg_content, datetime.now()))
    conn.execute("UPDATE chat_sessions SET updated_at = ? WHERE session_id = ?", (datetime.now(), session_id))
    conn.commit()
    conn.close()

    bot_content = ""
    sources_raw = ""
    in_sources = False
    
    async for chunk in stream_chat(messages, model):
        if "Sources:\n" in chunk:
            in_sources = True
            sources_raw += chunk
        elif in_sources:
            sources_raw += chunk
        else:
            bot_content += chunk
        yield chunk
        
    conn = get_db()
    bot_msg_id = str(uuid.uuid4())
    conn.execute('''
        INSERT INTO chat_history (message_id, session_id, role, content, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (bot_msg_id, session_id, 'bot', bot_content, datetime.now()))
    
    if sources_raw:
        lines = sources_raw.split('\n')
        import re
        for line in lines:
            match = re.search(r'- \[ID: (.*?)\|(.*?)\|(.*?)\|(.*?)\]', line)
            if match:
                conn.execute('''
                    INSERT INTO message_sources (message_id, type, title, reference)
                    VALUES (?, ?, ?, ?)
                ''', (bot_msg_id, match.group(2), match.group(3), match.group(4)))
                
    conn.commit()
    conn.close()

@app.post("/chat")
async def chat(request: ChatRequest):
    if request.session_id:
        return StreamingResponse(stream_chat_and_save(request.messages, request.model, request.session_id), media_type="text/event-stream")
    return StreamingResponse(stream_chat(request.messages, request.model), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
