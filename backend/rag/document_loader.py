import asyncio
import pdfplumber
import fitz  # PyMuPDF
from youtube_transcript_api import YouTubeTranscriptApi
import urllib.parse as urlparse
import easyocr
import io

# Global EasyOCR singleton
reader = None

def get_easyocr_reader():
    global reader
    if reader is None:
        reader = easyocr.Reader(['en'], gpu=True)
    return reader

async def process_text(file_content: bytes, filename: str) -> str:
    text = file_content.decode('utf-8', errors='ignore')
    return f"[TEXT] {text}"

async def process_pdf(file_content: bytes, filename: str) -> str:
    # pdfplumber -> PyMuPDF fallback
    text_parts = []
    
    # Try pdfplumber
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception:
        pass
        
    if not text_parts:
        # Try PyMuPDF
        try:
            doc = fitz.open(stream=file_content, filetype="pdf")
            for page in doc:
                text = page.get_text()
                if text:
                    text_parts.append(text)
        except Exception:
            pass
            
    if not text_parts:
        # Fallback to OCR using EasyOCR on PyMuPDF images
        try:
            doc = fitz.open(stream=file_content, filetype="pdf")
            r = get_easyocr_reader()
            for page in doc:
                pix = page.get_pixmap()
                img_bytes = pix.tobytes("png")
                # EasyOCR can take image bytes
                results = r.readtext(img_bytes, detail=0)
                text_parts.append(" ".join(results))
        except Exception as e:
            print(f"OCR failed: {e}")
            
    combined = "\n".join(text_parts).strip()
    # Normalize whitespace
    combined = " ".join(combined.split())
    return f"[PDF] {combined}"

async def process_youtube(youtube_url: str) -> str:
    # Extract video ID
    parsed = urlparse.urlparse(youtube_url)
    video_id = None
    if parsed.hostname == 'youtu.be':
        video_id = parsed.path[1:]
    elif parsed.hostname in ('www.youtube.com', 'youtube.com'):
        if parsed.path == '/watch':
            video_id = urlparse.parse_qs(parsed.query).get('v', [None])[0]
            
    if not video_id:
        return ""
        
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id).to_raw_data()
        duration = 0
        if transcript:
            last_segment = transcript[-1]
            duration = last_segment['start'] + last_segment['duration']
            
        lines = []
        for segment in transcript:
            lines.append(f"<T s={segment['start']:.1f} d={segment['duration']:.1f}>{segment['text']}</T>")
        text = " ".join(lines)
        return f"[YOUTUBE_MD] id={video_id} dur={duration:.1f} | {text}"
    except Exception as e:
        print(f"Youtube error: {e}")
        return ""
