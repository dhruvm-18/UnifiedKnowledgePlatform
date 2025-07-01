from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
import os
from dotenv import load_dotenv
import json

class RAGPipeline:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        # Get OpenAI API key from environment
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        if not self.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        # Initialize the LLM
        self.llm = ChatOpenAI(
            model="gpt-3.5",
            temperature=0.7,
            openai_api_key=self.OPENAI_API_KEY,
            streaming=True
        )
        
        # Initialize the embeddings
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-ada-002",
            openai_api_key=self.OPENAI_API_KEY
        )
        
        # Initialize or load the vector store
        try:
            self.vectorstore = FAISS.load_local(
                folder_path="./faiss_index",
                embeddings=self.embeddings
            )
        except:
            # If no index exists, create an empty one
            self.vectorstore = FAISS.from_texts(
                ["Welcome to the document Q&A system. Please upload some documents to get started."],
                self.embeddings
            )
            self.vectorstore.save_local("./faiss_index")
        
        # Create the retriever
        self.retriever = self.vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 5}
        )
        
        # Define the prompt template
        self.prompt_template = """You are a helpful AI assistant. Use the following context to answer the question. 
        If you don't know the answer, just say that you don't know. Don't try to make up an answer.
        
        Context: {context}
        
        Question: {question}
        
        Answer:"""
        
        self.prompt = ChatPromptTemplate.from_template(self.prompt_template)
        
        # Create the chain
        self.chain = (
            {"context": RunnablePassthrough(), "question": RunnablePassthrough()}
            | self.prompt
            | self.llm
            | StrOutputParser()
        )
    
    def process_query(self, query: str) -> str:
        """Process a query and return the response"""
        # Get relevant documents
        docs = self.retriever.get_relevant_documents(query)
        # Feedback-based re-ranking
        try:
            with open('backend/chunk_feedback_scores.json', 'r') as f:
                chunk_scores = json.load(f)
        except Exception:
            chunk_scores = {}
        def get_score(doc):
            chunk_id = getattr(doc, 'metadata', {}).get('chunk_id') or getattr(doc, 'metadata', {}).get('id')
            score = 0
            if chunk_id and chunk_id in chunk_scores:
                stats = chunk_scores[chunk_id]
                score += stats.get('net', 0)
                if stats.get('avg_stars'):
                    score += stats['avg_stars'] - 3  # Centered at neutral
            return score
        docs = sorted(docs, key=get_score, reverse=True)
        context = "\n\n".join(doc.page_content for doc in docs)
        
        # Generate response
        response = self.chain.invoke({"context": context, "question": query})
        
        return response 