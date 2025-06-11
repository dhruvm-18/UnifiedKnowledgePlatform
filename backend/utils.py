from typing import List
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_core.embeddings import Embeddings
import os

def initialize_faiss_index(documents: List[Document], embeddings: Embeddings) -> FAISS:
    """Initialize a FAISS index with the given documents and embeddings."""
    if not documents:
        raise ValueError("No documents provided for index initialization")
    
    # Create the FAISS index
    vectorstore = FAISS.from_documents(documents, embeddings)
    return vectorstore

def update_faiss_index(documents: List[Document], embeddings: Embeddings, existing_index: FAISS = None) -> FAISS:
    """Update an existing FAISS index with new documents or create a new one if none exists."""
    if existing_index:
        # Add new documents to existing index
        existing_index.add_documents(documents)
        return existing_index
    else:
        # Create new index
        return initialize_faiss_index(documents, embeddings) 

def structure_prompt_from_file(prompt_file_path: str, query: str, context: str) -> str:
    """Reads a natural language prompt file and structures the prompt for the language model."""
    try:
        with open(prompt_file_path, 'r', encoding='utf-8') as f:
            prompt_instructions = f.read()
    except FileNotFoundError:
        return f"Error: Prompt file not found at {prompt_file_path}.\n\nContext:\n{context}\n\nQuestion:\n{query}"
    except Exception as e:
        return f"Error reading prompt file: {e}.\n\nContext:\n{context}\n\nQuestion:\n{query}"

    # Combine instructions, context, and query
    structured_prompt = f"""{prompt_instructions}

Context:
{context}

Question:
{query}

Answer:
"""
    return structured_prompt 