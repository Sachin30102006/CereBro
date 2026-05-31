import re
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

CHROMA_PERSIST_DIR = "chroma_db"

_embeddings = None

def get_vectorstore():
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
    return Chroma(
        collection_name="localrag",
        embedding_function=_embeddings,
        persist_directory=CHROMA_PERSIST_DIR
    )

def chunk_text(text: str, doc_id: str, source_type: str, filename: str) -> list[Document]:
    video_id = ""
    duration = ""
    if text.startswith("[TEXT]"):
        content = text[6:].strip()
    elif text.startswith("[PDF]"):
        content = text[5:].strip()
    elif text.startswith("[YOUTUBE_MD]"):
        end_idx = text.find("|")
        meta_str = text[12:end_idx].strip()
        content = text[end_idx+1:].strip()
        # Parse id=xxx dur=xxx
        for part in meta_str.split():
            if part.startswith("id="):
                video_id = part[3:]
            elif part.startswith("dur="):
                duration = part[4:]
    else:
        content = text

    splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=150)
    
    if source_type == "youtube":
        pattern = re.compile(r'<T s=([\d\.]+) d=([\d\.]+)>([^<]+)</T>')
        matches = pattern.findall(content)
        
        docs = []
        current_chunk_text = ""
        current_start = None
        current_end = None
        
        for s, d, t in matches:
            start_t = float(s)
            dur_t = float(d)
            end_t = start_t + dur_t
            
            if current_start is None:
                current_start = start_t
                
            current_end = end_t
            current_chunk_text += t + " "
            
            if len(current_chunk_text) >= 1200:
                docs.append(Document(
                    page_content=current_chunk_text.strip(),
                    metadata={
                        "source": source_type,
                        "doc_id": doc_id,
                        "title": filename,
                        "start_time": current_start,
                        "end_time": current_end,
                        "video_id": video_id,
                        "duration": duration
                    }
                ))
                current_chunk_text = ""
                current_start = None
                
        if current_chunk_text:
            docs.append(Document(
                page_content=current_chunk_text.strip(),
                metadata={
                    "source": source_type,
                    "doc_id": doc_id,
                    "title": filename,
                    "start_time": current_start,
                    "end_time": current_end,
                    "video_id": video_id,
                    "duration": duration
                }
            ))
        return docs
    else:
        chunks = splitter.split_text(content)
        docs = []
        for i, chunk in enumerate(chunks):
            docs.append(Document(
                page_content=chunk,
                metadata={
                    "source": source_type,
                    "doc_id": doc_id,
                    "title": filename,
                    "page": i + 1
                }
            ))
        return docs

def add_documents_to_store(docs: list[Document]):
    vectorstore = get_vectorstore()
    vectorstore.add_documents(docs)
