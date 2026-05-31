from langchain_classic.retrievers.ensemble import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
from .vectorstore import get_vectorstore

def get_ensemble_retriever(k=5, filter=None):
    vectorstore = get_vectorstore()
    search_kwargs = {"k": k}
    if filter:
        search_kwargs["filter"] = filter
    return vectorstore.as_retriever(search_kwargs=search_kwargs)
