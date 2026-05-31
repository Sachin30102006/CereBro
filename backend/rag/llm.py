from langchain_community.llms import Ollama
from langchain_core.prompts import PromptTemplate
from typing import AsyncGenerator, List
from langchain_core.documents import Document
from .retrieval import get_ensemble_retriever

PROMPT_TEMPLATE = """You are a helpful assistant. Use the following context to answer the question.
If the answer is not in the context, say that you don't know based on the provided documents.

Context:
{context}

Question: {question}

{format_instructions}

Answer:"""

prompt = PromptTemplate(
    template=PROMPT_TEMPLATE,
    input_variables=["context", "question", "format_instructions"]
)

async def stream_chat(messages: List[dict], model_name: str = "qwen2.5:7b") -> AsyncGenerator[str, None]:
    # Extract the last user message
    user_msg = ""
    attachments = []
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_msg = msg.get("content", "")
            attachments = msg.get("attachments", [])
            break

    if not user_msg:
        yield "No user message found."
        return

    # Retrieve context
    filter_dict = None
    deep_dive = False
    
    if attachments:
        deep_dive = True
        doc_ids = [a.get("id") for a in attachments if "id" in a]
        if doc_ids:
            if len(doc_ids) == 1:
                filter_dict = {"doc_id": doc_ids[0]}
            else:
                filter_dict = {"doc_id": {"$in": doc_ids}}

    trigger_words = ["full", "entire", "explain", "explanation", "explaination", "summary", "summarize", "summarise", "detail", "comprehensive"]
    if any(word in user_msg.lower() for word in trigger_words):
        deep_dive = True

    # Use a massive context window for deep dives, otherwise keep it tight for quick Q&A
    k_value = 30 if deep_dive else 5

    retriever = get_ensemble_retriever(k=k_value, filter=filter_dict)
    retrieved_docs = retriever.invoke(user_msg)
    
    # Format context
    context_text = "\n\n".join([f"Document [ID: {doc.metadata.get('doc_id')} | {doc.metadata.get('title')}]:\n{doc.page_content}" for doc in retrieved_docs])
    
    # Format citations for the frontend (the frontend expects [ID: ...] somewhere or just sources in the message)
    # The frontend parses [ID: ...] if we include it in the stream or we just send it. Wait, the user said:
    # "Parse [ID] strings to display the appropriate CitationChips dynamically."
    # So I will yield the citations block at the very end of the stream.
    
    # Check for youtube sources
    has_youtube = False
    video_title = ""
    video_duration = ""
    video_id = ""
    for doc in retrieved_docs:
        if doc.metadata.get("source") == "youtube":
            has_youtube = True
            video_title = doc.metadata.get("title", "Unknown")
            video_duration = doc.metadata.get("duration", "0")
            video_id = doc.metadata.get("video_id", "")
            break
            
    format_instructions = ""
    if has_youtube:
        format_instructions = f"""Because the context contains a YouTube transcript, you MUST format your final response exactly like this template:

📹 Video: {video_title}
⏱️ Duration: {video_duration}s

📝 SUMMARY:
• Key point 1 (timestamp: [start_time s]): [Highly detailed explanation]
• Key point 2 (timestamp: [start_time s]): [Highly detailed explanation]
(Include at least 15 to 20 detailed bullet points. You must cover the ENTIRE duration of the provided context. Do NOT skip any major sections. Extract as much rich information as possible. Quote specific start_time values from the context for each point.)

🔗 Watch: https://youtube.com/watch?v={video_id}"""

    final_prompt = prompt.format(context=context_text, question=user_msg, format_instructions=format_instructions)
    
    # Initialize the LLM with the requested model and keep it in memory
    llm = Ollama(model=model_name, keep_alive=-1)
    
    # Stream the LLM output
    try:
        async for chunk in llm.astream(final_prompt):
            yield chunk
    except Exception as e:
        error_msg = str(e)
        if "404" in error_msg or "not found" in error_msg.lower():
            yield f"\n\n**Error:** The model `{model_name}` is not installed in your Ollama. Please open your terminal and run `ollama pull {model_name}` to download it first!"
        else:
            yield f"\n\n**Error:** Failed to communicate with Ollama: {error_msg}"
        
    # Append citations at the bottom for the frontend to parse
    if retrieved_docs:
        yield "\n\nSources:\n"
        seen_sources = set()
        for doc in retrieved_docs:
            doc_id = doc.metadata.get("doc_id", "Unknown")
            title = doc.metadata.get("title", "Unknown")
            source_type = doc.metadata.get("source", "doc")
            ref = ""
            if "page" in doc.metadata:
                ref = f"p.{doc.metadata['page']}"
            elif "start_time" in doc.metadata:
                ref = f"[{doc.metadata['start_time']}s]"
                
            source_str = f"- [ID: {doc_id}|{source_type}|{title}|{ref}]"
            if source_str not in seen_sources:
                seen_sources.add(source_str)
                yield source_str + "\n"
