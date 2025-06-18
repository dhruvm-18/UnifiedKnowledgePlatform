import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["OMP_NUM_THREADS"] = "1"

import json
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, g, session
from flask_cors import CORS
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from prompts import (
    CORE_INSTRUCTION,
    FORMAT_PROMPT,
    DETAILED_RESPONSE_INSTRUCTION,
    FILTER_PROMPT,
    GREETING_INSTRUCTION,
    SUMMARIZATION_INSTRUCTION,
    COMPARISON_INSTRUCTION,
    EXTRACTION_INSTRUCTION,
    ANALYSIS_INSTRUCTION,
    TECHNICAL_INSTRUCTION,
    DEFINITION_INSTRUCTION,
    EXAMPLE_INSTRUCTION,
    TRANSLATION_INSTRUCTION,
    CLARIFICATION_INSTRUCTION,
    GENERAL_INSTRUCTION,
    DPDP_INSTRUCTION,
    PARLIAMENT_INSTRUCTION,
    generate_source_link
)
from backend.utils import initialize_faiss_index, update_faiss_index
import logging
import faiss
import warnings
from dotenv import load_dotenv
from PyPDF2 import PdfReader
import glob
import uuid
import re
from pypdf import PdfReader
from werkzeug.utils import secure_filename
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from elevenlabs import play # Keep play for local playback if needed
from elevenlabs.client import ElevenLabs # Import the client class
import requests

# Suppress Faiss GPU warnings
warnings.filterwarnings("ignore", message=".*GpuIndexIVFFlat.*")

# Configure logging
logging.basicConfig(level=logging.INFO) # Changed from DEBUG to INFO
logger = logging.getLogger(__name__)

# Suppress specific loggers
logging.getLogger('werkzeug').setLevel(logging.WARNING)  # Reduce werkzeug logging
logging.getLogger('watchdog').setLevel(logging.WARNING)  # Reduce watchdog logging
logging.getLogger('faiss').setLevel(logging.WARNING)  # Reduce faiss logging
logging.getLogger('langchain').setLevel(logging.WARNING)  # Reduce langchain logging

# Explicitly configure Faiss to use CPU
faiss.omp_set_num_threads(4)  # Set number of threads for CPU operations

# Initialize Flask app
app = Flask(__name__)

# Configure Flask app
app.config['DEBUG'] = False
app.config['TEMPLATES_AUTO_RELOAD'] = False
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'supersecretkey')
app.config['SESSION_COOKIE_NAME'] = 'rag_chatbot_session_id'

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept", "Authorization"],
        "expose_headers": ["X-PDF-Page", "X-PDF-Section"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

# Create uploads directory if it doesn't exist
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', 'pdfs')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
logger.info(f"UPLOAD_FOLDER resolved to: {UPLOAD_FOLDER}")

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Load environment variables
load_dotenv()

# Configure Gemini API
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyB1whZlck89xDwjawOBsqPCpP8-V-oDwFM") # Using the provided API key
genai.configure(api_key=GOOGLE_API_KEY)

# Configure ElevenLabs API
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "sk_3308db3a66a549976266cbdeb9387297390112d4d18158a6")
# Initialize ElevenLabs client
elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# Configure Sarvam API
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "560098fc-7d8b-4ede-bf46-ffebae088e30") # Using the provided API key

# Initialize the LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-preview-05-20",  # Updated to correct model name
    temperature=0.7,
    google_api_key=GOOGLE_API_KEY,
    streaming=True
)

# Initialize the embeddings
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

document_heading = None

# Path to the manual page mappings file (commented out for auto-detection test)
# PDF_PAGE_MAPPINGS_FILE = os.path.join(os.path.dirname(__file__), 'pdf_page_mappings.json')

# def load_manual_page_mappings():
#     """Loads manual page number mappings from a JSON file."""
#     if os.path.exists(PDF_PAGE_MAPPINGS_FILE):
#         try:
#             with open(PDF_PAGE_MAPPINGS_FILE, 'r') as f:
#                 return json.load(f)
#         except Exception as e:
#             logger.error(f"Error loading manual page mappings from {PDF_PAGE_MAPPINGS_FILE}: {e}")
#     return {}

# manual_page_mappings = load_manual_page_mappings()

def load_pdfs_from_directory(directory_path: str) -> list[Document]:
    """Load all PDFs from a directory and convert them to documents"""
    global document_heading
    documents = []
    
    # Add logging to debug PDF loading
    logger.info(f"load_pdfs_from_directory called with directory_path: {directory_path}") # Log the input path
    pdf_pattern = os.path.join(app.config['UPLOAD_FOLDER'], "*.pdf") # Use configured UPLOAD_FOLDER
    logger.info(f"Searching for PDFs with pattern: {pdf_pattern}")
    pdf_files = glob.glob(pdf_pattern)
    logger.info(f"Found PDF files: {pdf_files}") # Log the result of glob.glob
    
    for pdf_file in pdf_files:
        try:
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            
            doc = Document(
                page_content=text,
                metadata={"source": os.path.basename(pdf_file)}
            )
            documents.append(doc)
            logger.info(f"Successfully loaded PDF: {pdf_file}")
        except Exception as e:
            logger.error(f"Error loading PDF {pdf_file}: {str(e)}")
    
    if documents:
        # Set the global document_heading using the first loaded document's source metadata
        document_heading = documents[0].metadata.get('source', 'Uploaded Document')
        logger.info(f"Document Heading set to: {document_heading}")
    else:
        document_heading = 'No Document Loaded'
        logger.warning("No PDF documents loaded from directory.")
    
    return documents

def process_pdf(filepath):
    """Process a single PDF file and update the FAISS index"""
    global retriever
    try:
        # Read the PDF file
        reader = PdfReader(filepath)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        # Create a document with metadata
        doc = Document(
            page_content=text,
            metadata={"source": os.path.basename(filepath)}
        )
        
        # Initialize or update the FAISS index
        if retriever is None:
            # If no retriever exists, create a new FAISS index
            vectorstore = initialize_faiss_index([doc], embeddings)
            retriever = vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 5}
            )
        else:
            # If retriever exists, update the existing FAISS index
            update_faiss_index([doc], embeddings)
            
        logger.info(f"Successfully processed PDF: {filepath}")
        return True
    except Exception as e:
        logger.error(f"Error processing PDF {filepath}: {str(e)}")
        return False

# Initialize vector store with PDFs
pdf_documents = load_pdfs_from_directory("backend/pdfs")
vectorstore = initialize_faiss_index(pdf_documents, embeddings)
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}
)

# In-memory session storage
sessions = {}

# Session file path
SESSIONS_FILE = 'sessions.json'

MAX_CONVERSATION_HISTORY = int(os.getenv('MAX_CONVERSATION_HISTORY', 10))

def save_sessions():
    """Save sessions to a JSON file."""
    try:
        with open(SESSIONS_FILE, 'w') as f:
            json.dump(sessions, f, indent=4)
        logger.info("Sessions saved to file.")
    except Exception as e:
        logger.error(f"Error saving sessions: {e}")

def load_sessions():
    """Load sessions from a JSON file."""
    global sessions
    if os.path.exists(SESSIONS_FILE):
        try:
            with open(SESSIONS_FILE, 'r') as f:
                sessions = json.load(f)
            logger.info("Sessions loaded from file.")
        except Exception as e:
            logger.error(f"Error loading sessions: {e}")

@app.route('/sessions', methods=['GET'])
def get_sessions():
    """Get all sessions"""
    return jsonify(list(sessions.values()))

@app.route('/sessions', methods=['POST'])
def create_session():
    """Create a new session"""
    session_id = str(uuid.uuid4())
    session = {
        'id': session_id,
        'title': f'New Chat {len(sessions) + 1}',
        'createdAt': datetime.now().isoformat(),
        'messages': [],
        'agentId': None  # Initialize agentId as None for new sessions
    }
    sessions[session_id] = session
    save_sessions() # Save sessions after creating a new one
    return jsonify(session)

@app.route('/sessions/<session_id>', methods=['DELETE', 'OPTIONS'])
def delete_session(session_id):
    """Delete a session"""
    if request.method == 'OPTIONS':
        return '', 200
        
    if session_id in sessions:
        del sessions[session_id]
        save_sessions() # Save sessions after deleting one
        return '', 204
    return jsonify({'error': 'Session not found'}), 404

@app.route('/sessions/<session_id>', methods=['PUT'])
def update_session(session_id):
    """Update a session's information"""
    if session_id not in sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    data = request.json
    new_title = data.get('title')
    
    if new_title is not None:
        sessions[session_id]['title'] = new_title
        save_sessions() # Save sessions after updating one
        return jsonify(sessions[session_id])
    
    return jsonify({'error': 'No update data provided'}), 400

@app.route('/sessions/<session_id>/messages', methods=['GET'])
def get_messages(session_id):
    """Get messages for a session"""
    if session_id not in sessions:
        return jsonify({'error': 'Session not found'}), 404
    return jsonify(sessions[session_id]['messages'])

def get_label_to_page_map(pdf_path):
    """Extract a mapping from page label (logical page number/section) to actual page number."""
    try:
        reader = PdfReader(pdf_path)
        label_to_page = {}
        page_labels = getattr(reader, 'page_labels', None)
        if page_labels is None and hasattr(reader, 'get_page_labels'):
            page_labels = reader.get_page_labels()
        
        if page_labels is None:
            print("DEBUG: [get_label_to_page_map] No page labels found with pypdf, falling back to 1-based page numbers.")
            for i in range(len(reader.pages)):
                label_to_page[str(i + 1)] = i + 1
        else:
            print(f"DEBUG: [get_label_to_page_map] Found pypdf page labels: {page_labels}")
            for i, label in enumerate(page_labels):
                label_to_page[str(label)] = i + 1  # 1-based page number
        print(f"DEBUG: [get_label_to_page_map] Generated pypdf label_to_page map: {label_to_page}")
        return label_to_page
    except Exception as e:
        print(f"DEBUG: [get_label_to_page_map] Error for {pdf_path}: {e}")
        logger.error(f"Error in get_label_to_page_map for {pdf_path}: {e}")
        return {}

def format_response_with_sources(response, sources):
    """Format the response with source information"""
    if not response:
        return None
        
    # Split response into content and sources
    parts = response.split('**Sources:**')
    if len(parts) != 2:
        return response
        
    content = parts[0].strip()
    sources_block = parts[1].strip()

    formatted_sources = []
    # Regex to match source lines:
    # - **[Section/Page/Reference]** (pdf://<filename>/page/<page_number>#section=<section>)
    source_line_regex = r'^-?\s*\*\*\[(.*?)\]\*\*\s*\(pdf:\/\/(.*?)(?:\/page\/(\d+))?(?:#section=(.*?))?\)(?:\s*:\s*.*)?$'

    for line in sources_block.split('\n'):
        line = line.strip()
        if not line:
            continue

        match = re.search(source_line_regex, line, re.IGNORECASE)
        if match:
            display_text_content = match.group(1).strip() 
            filename = match.group(2).strip() 
            page_number = match.group(3) # This is the page number captured by regex
            section = match.group(4) # This is the section fragment captured by regex
            
            # Get the actual physical PDF page
            actual_pdf_page = None
            if page_number:
                actual_pdf_page = int(page_number) # Use the page number directly
            else:
                actual_pdf_page = 1 # Default to page 1 if no page number found
            
            # Format the display text
            display_text = display_text_content
            if str(actual_pdf_page) != page_number:
                display_text = f"{display_text_content} (PDF Pg {actual_pdf_page})"

            # Construct the source link in the format expected by the frontend
            # The goal is to send only the pdf:// link, and let the frontend format the button text
            formatted_source_line = f"- (pdf://{filename}/page/{actual_pdf_page}{'#section=' + section if section else ''})"
            formatted_sources.append(formatted_source_line)
        else:
            # Handle the new pattern: [TEXT1](TEXT2)
            # Where TEXT2 contains Section/Rule and Page info
            general_markdown_link_regex = r'\[(.*?)\]\((.*?)\)'
            general_match = re.search(general_markdown_link_regex, line)
            if general_match:
                llm_display_text = general_match.group(1).strip() # e.g., 303(4, Page 111)
                llm_link_content = general_match.group(2).strip() # e.g., Section 303(4), Page 111

                # Try to extract section and page from llm_link_content
                section_page_extract_regex = r'(?:Section|Rule)\s*([\d\.\(\)]+),\s*Page\s*(\d+)'
                section_page_match = re.search(section_page_extract_regex, llm_link_content)

                extracted_section = None
                extracted_page = None

                if section_page_match:
                    extracted_section = section_page_match.group(1) # e.g., 303(4)
                    extracted_page = section_page_match.group(2) # e.g., 111
                
                # Determine the filename to use (heuristic: use the first source's filename)
                filename_to_use = "document.pdf" # Fallback
                if sources and len(sources) > 0 and 'source' in sources[0].metadata:
                    filename_to_use = sources[0].metadata['source']
                
                if extracted_section and extracted_page:
                    # Construct the pdf:// link
                    formatted_source_line = f"- (pdf://{filename_to_use}/page/{extracted_page}#section={extracted_section})"
                    formatted_sources.append(formatted_source_line)
                else:
                    # If parsing from [TEXT](TEXT) failed, append the original line
                    formatted_sources.append(line)
            else:
                # If no pattern matched, append the original line
                formatted_sources.append(line)

    # Reconstruct the response with formatted sources
    formatted_response = f"{content}\n\n**Sources:**\n" + "\n".join(formatted_sources)
    return formatted_response

def create_structured_prompt(user_message, context, doc_id=None, DOCUMENT_HEADING=None, USER_NAME=None, AGENT_ID=None):
    """Create a structured prompt using the instruction constants"""
    # Check if the message contains Hindi characters
    hindi_pattern = re.compile(r'[\u0900-\u097F]')
    is_hindi = bool(hindi_pattern.search(user_message))
    
    # Check if it's a pure greeting vs a question with greeting
    greeting_keywords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening']
    question_keywords = ['what', 'why', 'how', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does', 'did']
    
    # Check if message contains both greeting and question keywords
    has_greeting = any(keyword in user_message.lower() for keyword in greeting_keywords)
    has_question = any(keyword in user_message.lower() for keyword in question_keywords)
    
    # Select instruction based on agent ID first
    if AGENT_ID == 'DPDP':
        selected_instruction = DPDP_INSTRUCTION
    elif AGENT_ID == 'Parliament':
        selected_instruction = PARLIAMENT_INSTRUCTION
    elif has_greeting and not has_question and len(user_message.split()) <= 3:
        # Only treat as pure greeting if it's just a greeting without any question content
        return {
            "prompt": GREETING_INSTRUCTION,
            "query_type": "greeting",
            "metadata": {"is_greeting": True, "agent_id": AGENT_ID}
        }
    else:
        # Determine if the user is asking for a comparison to prioritize table format
        is_comparison_query = any(keyword in user_message.lower() for keyword in ['compare', 'contrast', 'difference', 'similarity', 'vs'])
        
        # Determine if the user is asking for a detailed/elaborated response
        is_detailed_query = any(keyword in user_message.lower() for keyword in ['elaborate', 'detail', 'detailed', 'explain more', 'tell me more', 'in depth'])
        
        # Determine if the user is asking for a definition
        is_definition_query = any(keyword in user_message.lower() for keyword in ['define', 'what is', 'meaning of', 'definition of', 'explain'])

        # Select the appropriate instruction based on query type
        if is_detailed_query:
            selected_instruction = DETAILED_RESPONSE_INSTRUCTION
        elif is_comparison_query:
            selected_instruction = COMPARISON_INSTRUCTION
        elif is_definition_query:
            selected_instruction = DEFINITION_INSTRUCTION
        else:
            selected_instruction = CORE_INSTRUCTION

    # Create the base prompt with core instructions and formatting guidelines
    language_instruction = """
IMPORTANT: Respond in the same language as the user's question. If the question is in Hindi, respond in Hindi. If the question is in English, respond in English.
""" if is_hindi else ""

    base_prompt = f"""
{CORE_INSTRUCTION}

{language_instruction}

You are an AI assistant designed to answer questions based on the provided context.
Carefully read the following context and answer the user's question directly and concisely.
If the answer is not found in the context, state that you cannot answer based on the provided information.

## Context Source(s): {DOCUMENT_HEADING}
## Context:
{context}

## User's Question:
{user_message}

## Formatting Instructions (Strict Adherence Required):

1. **Direct Output**: Respond with the requested information or format immediately after a brief acknowledgment. Avoid conversational filler or lengthy introductions, especially when a specific format like a table is requested.

2. **Comparison Tables**: **WHEN ASKED TO COMPARE**, your response MUST start with a markdown table summarizing the comparison. Generate the table first, followed by any necessary detailed explanation. Crucially, use standard markdown table syntax ONLY. Do NOT use HTML tags like `<br>` within table cells. Ensure the complete text for each item is included in its respective cell without truncation.
   - Use markdown table syntax with proper alignment
   - Include headers with bold text
   - Example:
     | **Header 1** | **Header 2** |
     |--------------|--------------|
     | Content 1    | Content 2    |

3. **PDF Links Format**:
   - Use the format: pdf://<filename>/page/<page_number>#section=<section_name>
   - Example: pdf://DPDP_act.pdf/page/9#section=Section_1
   - The backend will automatically convert these to http:// URLs with query parameters
   - Always include source information in the response

4. **Context-Aware Responses**:
   - If the message contains both a greeting and a question, prioritize answering the question
   - Maintain professional tone while being helpful
   - Focus on the substantive content of the query

5. **GDPR and Privacy Queries**:
   - For privacy-related questions, provide detailed and accurate information
   - Include relevant legal context and implications
   - Cite specific sections of relevant documents
"""

    # Combine the selected instruction with the base prompt
    final_prompt = f"""{selected_instruction}

{base_prompt}"""

    # Determine query type based on selected instruction or other factors
    query_type = "general"
    if AGENT_ID == 'DPDP':
        query_type = "dpdp_agent"
    elif AGENT_ID == 'Parliament':
        query_type = "parliament_agent"
    elif is_detailed_query:
        query_type = "detailed"
    elif is_comparison_query:
        query_type = "comparison"

    # Return the appropriate prompt based on query type
    return {
        "prompt": final_prompt,
        "query_type": query_type,
        "metadata": {
            "document_id": doc_id,
            "document_heading": DOCUMENT_HEADING,
            "user_name": USER_NAME,
            "agent_id": AGENT_ID
        }
    }

# Define the path to agents.json
AGENTS_JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'react-frontend', 'src', 'data', 'agents.json')

# Global variable to store agent data
AGENTS_DATA = {}

def save_agents_to_json():
    """Saves the current AGENTS_DATA to the agents.json file."""
    try:
        agents_list = list(AGENTS_DATA.values())
        os.makedirs(os.path.dirname(AGENTS_JSON_PATH), exist_ok=True)
        with open(AGENTS_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump({'agents': agents_list}, f, indent=2)
        logger.info(f"Agents data saved to {AGENTS_JSON_PATH}")
    except Exception as e:
        logger.error(f"Error saving agents to {AGENTS_JSON_PATH}: {e}")

def load_agent_data():
    """Load agent data from JSON file."""
    global AGENTS_DATA
    AGENTS_DATA = {}
    if os.path.exists(AGENTS_JSON_PATH):
        try:
            with open(AGENTS_JSON_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for agent in data.get('agents', []):
                    if 'pdfSources' not in agent and 'pdfSource' in agent:
                        agent['pdfSources'] = [agent['pdfSource']]
                    AGENTS_DATA[agent['agentId']] = agent
            logger.info(f"Loaded {len(AGENTS_DATA)} agents from {AGENTS_JSON_PATH}")
            return
        except Exception as e:
            logger.error(f"Error loading agent data from {AGENTS_JSON_PATH}: {e}")
    backup_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'agents.json')
    if os.path.exists(backup_path):
        try:
            with open(backup_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for agent in data.get('agents', []):
                    if 'pdfSources' not in agent and 'pdfSource' in agent:
                        agent['pdfSources'] = [agent['pdfSource']]
                    AGENTS_DATA[agent['agentId']] = agent
            logger.info(f"Loaded {len(AGENTS_DATA)} agents from backup path {backup_path}")
            save_agents_to_json()
            return
        except Exception as e:
            logger.error(f"Error loading agent data from backup path {backup_path}: {e}")
    default_agents = [
        {
            "iconType": "FaShieldAlt",
            "name": "DPDP Compliance",
            "description": "Get insights from the Digital Personal Data Protection Act. Ask about user rights, data fiduciaries, and obligations.",
            "buttonText": "Start Chat",
            "agentId": "DPDP",
            "pdfSources": ["DPDP_act.pdf"]
        },
        {
            "iconType": "FaGavel",
            "name": "Parliamentary Rules",
            "description": "Access information on the Rules of Procedure and Conduct of Business in Lok Sabha.",
            "buttonText": "Start Chat",
            "agentId": "Parliament",
            "pdfSources": ["Rules_of_Procedures_Lok_Sabha.pdf"]
        }
    ]
    for agent in default_agents:
        AGENTS_DATA[agent['agentId']] = agent
    save_agents_to_json()
    try:
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump({'agents': default_agents}, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving default agents to backup path {backup_path}: {e}")
    logger.info(f"Created {len(AGENTS_DATA)} default agents")

# Call this function on startup
load_agent_data()

@app.route('/sessions/<session_id>/messages', methods=['POST'])
def add_message(session_id):
    """Add a message to a session"""
    if session_id not in sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    data = request.json
    user_message = str(data.get('message', '')) if data.get('message') is not None else ''
    user_name = str(data.get('userName', 'User')) if data.get('userName') is not None else 'User'
    agent_id = data.get('agentId', None)
    pdf_source_from_frontend = data.get('pdfSource', None)
    
    logger.info(f"Processing user message: {user_message} for agent: {agent_id}, pdfSource: {pdf_source_from_frontend}")
    
    # Check if the message contains Hindi characters
    hindi_pattern = re.compile(r'[\u0900-\u097F]')
    is_hindi = bool(hindi_pattern.search(user_message))
    
    # Determine the target PDF sources based on agent_id or frontend provided pdfSource
    target_pdf_sources = []
    if pdf_source_from_frontend:
        target_pdf_sources = [pdf_source_from_frontend]
        logger.info(f"Using pdfSource from frontend: {target_pdf_sources}")
    elif agent_id and agent_id in AGENTS_DATA:
        target_pdf_sources = AGENTS_DATA[agent_id].get('pdfSources', [])
        logger.info(f"Using pdfSources from loaded agent data for agent {agent_id}: {target_pdf_sources}")
    elif agent_id == 'DPDP':
        target_pdf_sources = ['DPDP_act.pdf']
        logger.info(f"Fallback to hardcoded DPDP pdfSource: {target_pdf_sources}")
    elif agent_id == 'Parliament':
        target_pdf_sources = ['Rules_of_Procedures_Lok_Sabha.pdf']
        logger.info(f"Fallback to hardcoded Parliament pdfSource: {target_pdf_sources}")
    
    # Add messages to session with proper string conversion
    sessions[session_id]['messages'].append({
        'sender': 'user',
        'content': str(user_message),  # Ensure content is string
        'agentId': agent_id  # Store the agent ID received from frontend or inferred
    })
    
    # Get relevant context from documents
    all_docs = retriever.get_relevant_documents(user_message)
    logger.info(f"Retrieved {len(all_docs)} documents before agent filtering.")
    
    docs = []
    if target_pdf_sources:
        docs = [doc for doc in all_docs if doc.metadata.get('source') in target_pdf_sources]
        # Do NOT fallback to all_docs if none found; just return empty context for strict agent separation
    else:
        docs = []
    
    logger.info(f"Documents after agent filtering ({agent_id}): {[doc.metadata.get('source') for doc in docs]}")

    context = "\n\n".join([doc.page_content for doc in docs])
    # Escape curly braces in the context to prevent them from being misinterpreted as variables by Langchain
    escaped_context = context.replace('{', '{{').replace('}', '}}')
    logger.info(f"Retrieved context (first 500 chars): {escaped_context[:500]}...")
    
    # Dynamically determine document_heading based on retrieved documents
    current_doc_heading = "No Document Loaded"
    if docs:
        # Get unique sources from the retrieved documents
        unique_sources = list(set([doc.metadata.get('source', 'Unknown Document') for doc in docs]))
        if len(unique_sources) == 1:
            current_doc_heading = unique_sources[0]
        elif len(unique_sources) > 1:
            current_doc_heading = ", ".join(unique_sources) # Combine multiple sources

    # Get document ID from the first retrieved document's metadata (still useful for prompt metadata)
    document_id = docs[0].metadata.get('source', '') if docs else ''
    
    # Get the structured prompt
    prompt_data = create_structured_prompt(user_message, escaped_context, doc_id=document_id, DOCUMENT_HEADING=current_doc_heading, USER_NAME=user_name, AGENT_ID=agent_id)
    
    # Create the chain
    chain = (
        {"context": RunnablePassthrough(), "user_message": RunnablePassthrough()}
        | ChatPromptTemplate.from_template(prompt_data["prompt"])
        | llm
        | StrOutputParser()
    )
    
    # Generate response
    if is_hindi:
        # Use Sarvam API for Hindi responses
        try:
            # Make request to Sarvam API
            sarvam_response = requests.post(
                'https://api.sarvam.ai/v1/chat/completions',
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {SARVAM_API_KEY}'
                },
                json={
                    'model': 'sarvam-m',
                    'messages': [
                        {
                            'role': 'system',
                            'content': f'You are a helpful AI assistant. Answer based on this context: {escaped_context}'
                        },
                        {
                            'role': 'user',
                            'content': user_message
                        }
                    ],
                    'temperature': 0.7
                }
            )
            
            if sarvam_response.status_code == 200:
                response = sarvam_response.json()['choices'][0]['message']['content']
            else:
                logger.error(f"Sarvam API error: {sarvam_response.text}")
                response = "मुझे खेद है, लेकिन मैं इस समय आपके प्रश्न का उत्तर नहीं दे पा रहा हूं। कृपया कुछ देर बाद पुनः प्रयास करें।"
        except Exception as e:
            logger.error(f"Error calling Sarvam API: {e}")
            response = "मुझे खेद है, लेकिन मैं इस समय आपके प्रश्न का उत्तर नहीं दे पा रहा हूं। कृपया कुछ देर बाद पुनः प्रयास करें।"
    else:
        # Use Gemini for English responses
        response = chain.invoke({
            "context": escaped_context,
            "user_message": user_message
        })
    
    logger.info(f"Raw model response (first 500 chars): {response[:500]}...")
    
    # Format the response with source information
    formatted_response = format_response_with_sources(response, [doc.metadata.get('source', 'Unknown') for doc in docs])
    logger.info(f"Formatted sources after processing: {formatted_response.split('**Sources:**')[1] if '**Sources:**' in formatted_response else 'No sources block'}")
    
    # Log the formatted response (first 500 chars)
    if formatted_response is None:
        logger.error("Received None response from format_response_with_sources")
        formatted_response = "I apologize, but I encountered an error while processing your request. Please try again."
    else:
        logger.info(f"Formatted response (first 500 chars): {formatted_response[:500]}...")
    
    # Add messages to session
    sessions[session_id]['messages'].append({
        'sender': 'assistant',
        'content': str(formatted_response), # Ensure assistant response is always a string
        'agentId': agent_id # Store the agent ID for assistant messages as well
    })
    
    # Update session title if it's the first message
    if len(sessions[session_id]['messages']) == 2:
        # Generate title based on the first user message
        first_user_message_content = sessions[session_id]['messages'][0]['content']
        # Try to extract the first sentence
        first_sentence_match = re.match(r'([^.!?\n]+[.!?\n]?)', first_user_message_content)
        if first_sentence_match:
            generated_title = first_sentence_match.group(1).strip()
        else:
            # Fallback to the beginning of the message if no sentence ending punctuation
            generated_title = first_user_message_content.strip()

        # Truncate to a reasonable length (e.g., 50 characters) and add ellipsis if truncated
        max_title_length = 50
        if len(generated_title) > max_title_length:
            sessions[session_id]['title'] = generated_title[:max_title_length].strip() + '...'
        elif generated_title:
            sessions[session_id]['title'] = generated_title
        else:
            # Fallback if somehow the message was empty after stripping
            sessions[session_id]['title'] = f'Chat {len(sessions)}'

    save_sessions() # Save sessions after adding a message or updating title
    
    return jsonify({
        'response': formatted_response,
        'query_type': prompt_data['query_type'],
        'metadata': prompt_data['metadata'],
        'session': sessions[session_id],
        'agentId': agent_id
    })

# Add route to serve PDF files
@app.route('/pdfs/<path:filename>')
def serve_pdf(filename):
    """Serve PDF files from the backend/pdfs directory"""
    try:
        # Extract page number and section from query parameters
        page = request.args.get('page') # This is the LOGICAL page number from the frontend
        section = request.args.get('section') # This is the rule/section fragment
        
        # Log the request details
        print(f"DEBUG: [serve_pdf] PDF request - File: {filename}, Page (logical): {page}, Section (rule/fragment): {section}") # Debug print
        logger.info(f"PDF request - File: {filename}, Page (logical): {page}, Section (rule/fragment): {section}")
        
        # Construct the full path to the PDF file using the UPLOAD_FOLDER
        pdf_directory = app.config['UPLOAD_FOLDER'] # Use the configured UPLOAD_FOLDER
        pdf_path = os.path.join(pdf_directory, filename)
        print(f"DEBUG: [serve_pdf] Constructed pdf_path: {pdf_path}") # Debug print
        
        if not os.path.exists(pdf_path):
            print(f"DEBUG: [serve_pdf] PDF file not found: {pdf_path}") # Debug print
            logger.error(f"PDF file not found: {pdf_path}")
            return jsonify({'error': 'PDF file not found'}), 404
            
        # Read the PDF file
        with open(pdf_path, 'rb') as f:
            pdf_data = f.read()
            
        # Create response with PDF data
        response = app.response_class(
            response=pdf_data,
            status=200,
            mimetype='application/pdf'
        )
        
        # Add CORS headers explicitly for PDF serving
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Expose-Headers'] = 'X-PDF-Page, X-PDF-Section' # Keep both for flexibility
        response.headers['Access-Control-Allow-Credentials'] = 'true'

        # Add page and section information to headers
        if page:
            # Get the page label to actual page number map (will use manual or pypdf)
            page_map = get_label_to_page_map(pdf_path) # Use pdf_path directly here
            print(f"DEBUG: [serve_pdf] Received page_map from get_label_to_page_map: {page_map}") # Debug print
            
            # Convert the logical page number (from URL) to the actual PDF page number
            # If not found in map, fallback to parsing as int or default to 1
            actual_pdf_page_to_open = page_map.get(page)
            if actual_pdf_page_to_open is None:
                try:
                    actual_pdf_page_to_open = int(page) # Try parsing as int if not in map
                    print(f"DEBUG: [serve_pdf] Logical page '{page}' not in map, parsed as int: {actual_pdf_page_to_open}") # Debug print
                except ValueError:
                    actual_pdf_page_to_open = 1 # Default to page 1 if not a valid number
                    print(f"DEBUG: [serve_pdf] Logical page '{page}' not int, defaulting to: {actual_pdf_page_to_open}") # Debug print
            else:
                print(f"DEBUG: [serve_pdf] Logical page '{page}' mapped to actual_pdf_page_to_open: {actual_pdf_page_to_open}") # Debug print
            
            # Apply 33-page offset ONLY for Rules of Procedure PDF
            if filename == 'Rules_of_Procedures_Lok_Sabha.pdf':
                actual_pdf_page_to_open += 33
                print(f"DEBUG: [serve_pdf] Applied +33 offset for Rules_of_Procedures_Lok_Sabha.pdf. New page: {actual_pdf_page_to_open}")

            response.headers['X-PDF-Page'] = str(actual_pdf_page_to_open)

        # If a section/rule was provided, pass it as well (though PDF viewers mostly use #page)
        if section:
            response.headers['X-PDF-Section'] = section # Pass the original rule/section fragment
            
        return response
        
    except Exception as e:
        print(f"DEBUG: [serve_pdf] Error opening PDF: {str(e)}") # Debug print
        logger.error(f"Error opening PDF: {str(e)}")
        return jsonify({'error': str(e)}), 500

ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Add this function to rebuild the FAISS index from all PDFs in the upload folder
def rebuild_faiss_index():
    global retriever
    pdf_documents = load_pdfs_from_directory(app.config['UPLOAD_FOLDER'])
    vectorstore = initialize_faiss_index(pdf_documents, embeddings)
    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 5}
    )

@app.route('/upload-pdf', methods=['POST', 'OPTIONS'])
def upload_pdf():
    """Handle PDF file uploads (multiple files supported)"""
    if request.method == 'OPTIONS':
        return '', 200

    try:
        if 'files' not in request.files:
            logger.error("No files part in request")
            return jsonify({'error': 'No files part', 'success': False}), 400
        
        files = request.files.getlist('files')
        if not files or all(f.filename == '' for f in files):
            logger.error("No selected files")
            return jsonify({'error': 'No selected files', 'success': False}), 400
        
        saved_filenames = []
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                logger.info(f"Saving file: {filepath}")
                file.save(filepath)
                saved_filenames.append(filename)
            else:
                logger.error(f"Invalid file type: {file.filename}")
                return jsonify({'error': f'Invalid file type: {file.filename}', 'success': False}), 400
        try:
            logger.info(f"Rebuilding FAISS index after uploading: {saved_filenames}")
            rebuild_faiss_index()
            logger.info(f"FAISS index rebuilt successfully after uploading: {saved_filenames}")
            return jsonify({
                'message': 'Files uploaded and processed successfully',
                'filenames': saved_filenames,
                'success': True
            })
        except Exception as e:
            logger.error(f"Error during FAISS index rebuild: {str(e)}")
            # Remove all uploaded files if processing fails
            for filename in saved_filenames:
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                if os.path.exists(filepath):
                    os.remove(filepath)
            return jsonify({'error': f'Error processing PDFs: {str(e)}', 'success': False}), 500
    except Exception as e:
        logger.error(f"Unexpected error in upload_pdf route: {str(e)}")
        return jsonify({'error': f'Unexpected error: {str(e)}', 'success': False}), 500

# Load PDFs from uploads directory on startup
def load_uploaded_pdfs():
    global retriever # Declare retriever as global to modify it
    existing_pdfs_in_index = set()

    # Try to load existing FAISS index to get sources
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    if os.path.exists("faiss_index"):
        try:
            vectorstore = FAISS.load_local("faiss_index", embeddings, allow_dangerous_deserialization=True)
            # Extract existing sources from metadata (this might be tricky without iterating all docs)
            # For simplicity, we'll assume if it's in the folder, we should try to process it
            retriever = vectorstore.as_retriever()
            logger.info("Existing FAISS index loaded.")
        except Exception as e:
            logger.warning(f"Error loading existing FAISS index: {e}. A new index will be created if needed.")
            retriever = None # Reset retriever if loading fails
    else:
        logger.info("No existing FAISS index found. A new one will be created.")
        retriever = None

    # Process all PDFs in the UPLOAD_FOLDER
    if os.path.exists(UPLOAD_FOLDER):
        for filename in os.listdir(UPLOAD_FOLDER):
            if filename.endswith('.pdf'):
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                if retriever is None or filename not in existing_pdfs_in_index: # Only process if new or retriever is not initialized
                    try:
                        process_pdf(filepath) # This will update the global retriever
                        logger.info(f"Loaded PDF: {filename}")
                    except Exception as e:
                        logger.error(f"Error loading PDF {filename}: {str(e)}")
    
    if retriever is None:
        logger.warning("No PDFs processed and no retriever initialized. Chat functionality may be limited.")

# Call this function on startup
load_uploaded_pdfs()

# Initialize global retriever after load_uploaded_pdfs has potentially set it
# If no PDFs were found, `retriever` will remain None or be a mock.
if retriever is None:
    logger.warning("Retriever is still None after loading PDFs. Initializing a mock retriever.")
    class FallbackRetriever:
        def get_relevant_documents(self, query):
            logger.warning("Using FallbackRetriever: No documents indexed. Query will not have context.")
            return []
    retriever = FallbackRetriever()

# Agent management endpoints
@app.route('/agents', methods=['GET'])
def get_agents():
    """Get all agents from AGENTS_DATA"""
    try:
        # Reload agents from file to ensure we have the latest data
        load_agent_data()
        agents_list = list(AGENTS_DATA.values())
        logger.info(f"GET /agents: Returning {len(agents_list)} agents")
        return jsonify(agents_list)
    except Exception as e:
        logger.error(f"Error in get_agents: {e}")
        return jsonify([])

@app.route('/agents', methods=['POST'])
def add_agent():
    """Add a new agent to AGENTS_DATA and save to agents.json (supports multiple pdfSources)"""
    try:
        data = request.json
        agent_id = data.get('agentId')
        if not agent_id:
            return jsonify({'error': 'agentId is required', 'success': False}), 400
        
        if agent_id in AGENTS_DATA:
            return jsonify({'error': f'Agent with ID {agent_id} already exists', 'success': False}), 409

        # Accept pdfSources (list) or pdfSource (single file, for backward compatibility)
        pdf_sources = data.get('pdfSources')
        if not pdf_sources:
            pdf_source = data.get('pdfSource')
            if pdf_source:
                pdf_sources = [pdf_source]
            else:
                return jsonify({'error': 'Missing required agent pdfSources/pdfSource', 'success': False}), 400

        # Ensure required fields are present
        required_fields = ['name', 'description', 'iconType']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required agent fields', 'success': False}), 400

        agent_data = {
            'agentId': agent_id,
            'name': data['name'],
            'description': data['description'],
            'iconType': data['iconType'],
            'buttonText': data.get('buttonText', 'Start Chat'),
            'pdfSources': pdf_sources,
            'tileLineStartColor': data.get('tileLineStartColor', ''),
            'tileLineEndColor': data.get('tileLineEndColor', ''),
        }
        AGENTS_DATA[agent_id] = agent_data
        save_agents_to_json()
        logger.info(f"Added new agent: {agent_id}")
        return jsonify({
            'message': 'Agent created successfully',
            'agent': agent_data,
            'success': True
        }), 201
    except Exception as e:
        logger.error(f"Error adding agent: {str(e)}")
        return jsonify({'error': f'Error adding agent: {str(e)}', 'success': False}), 500

@app.route('/agents/<agent_id>', methods=['PUT', 'OPTIONS'])
def update_agent(agent_id):
    """Update an existing agent"""
    if request.method == 'OPTIONS':
        return '', 200

    if agent_id not in AGENTS_DATA:
        return jsonify({'error': 'Agent not found'}), 404
    
    # Update only allowed fields, or merge entire object
    data = request.json
    AGENTS_DATA[agent_id].update(data) # Update the agent data
    save_agents_to_json() # Save changes to JSON file
    logger.info(f"Updated agent: {agent_id}")
    return jsonify(AGENTS_DATA[agent_id])

@app.route('/agents/<agent_id>', methods=['DELETE', 'OPTIONS'])
def delete_agent(agent_id):
    """Delete an agent from AGENTS_DATA and save to agents.json"""
    if request.method == 'OPTIONS':
        return '', 200

    try:
        if agent_id not in AGENTS_DATA:
            return jsonify({'error': 'Agent not found'}), 404
        
        # Get all PDF filenames before deleting the agent
        pdf_filenames = AGENTS_DATA[agent_id].get('pdfSources', [])
        
        # Delete the agent from AGENTS_DATA
        del AGENTS_DATA[agent_id]
        
        # Save to JSON file immediately after deletion
        save_agents_to_json()
        
        # Delete all associated PDF files if they exist
        for pdf_filename in pdf_filenames:
            pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_filename)
            try:
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
                    logger.info(f"Deleted PDF file: {pdf_filename}")
            except Exception as e:
                logger.error(f"Error deleting PDF file {pdf_filename}: {str(e)}")
        
        logger.info(f"Deleted agent: {agent_id}")
        return '', 204
    except Exception as e:
        logger.error(f"Error deleting agent {agent_id}: {str(e)}")
        return jsonify({'error': f'Error deleting agent: {str(e)}'}), 500

@app.route('/elevenlabs/tts', methods=['POST', 'OPTIONS'])
def elevenlabs_tts():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.json
        text = data.get('text')
        voice_lang = data.get('voiceLang', 'en-US') # Get the voice language from the request
        
        # Set voice_id based on language
        if voice_lang == 'hi-IN':
            voice_id ='TXb68m09B5U6BTh8UMd5'# Hindi voice ID
        else:
            voice_id = 'NFG5qt843uXKj4pFvR7C'  # Default English voice ID (Adam) for other languages

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Use elevenlabs_client to generate audio
        audio_stream = elevenlabs_client.text_to_speech.stream(
            text=text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2", # Using a multilingual model
        )

        def generate_audio():
            for chunk in audio_stream:
                yield chunk

        response = app.response_class(generate_audio(), mimetype='audio/mpeg')
        response.headers['Content-Disposition'] = 'inline; filename="speech.mp3"'
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    except Exception as e:
        logger.error(f"ElevenLabs TTS error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/elevenlabs/stt', methods=['POST', 'OPTIONS'])
def elevenlabs_stt():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']
        audio_data = audio_file.read()

        # Placeholder for actual ElevenLabs STT integration
        # The ElevenLabs Python SDK primarily focuses on TTS.
        # For STT, you might need to use a different library or make a direct API call.
        # Example of how you might call their STT if a client method existed:
        # transcript = elevenlabs_client.speech_to_text.transcribe(audio_data)

        transcript = "This is a placeholder for transcribed text from ElevenLabs STT."

        response = jsonify({'transcript': transcript})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    except Exception as e:
        logger.error(f"ElevenLabs STT error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask app...")
    load_sessions()
    # Disable debug mode and reloader
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False) 