import os
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
from datetime import datetime
import re
import json
from pypdf import PdfReader

# Suppress Faiss GPU warnings
warnings.filterwarnings("ignore", message=".*GpuIndexIVFFlat.*")

# Configure logging
logging.basicConfig(level=logging.DEBUG) # Set to DEBUG for detailed logs
logger = logging.getLogger(__name__)

# Explicitly configure Faiss to use CPU
faiss.omp_set_num_threads(4)  # Set number of threads for CPU operations

# Load environment variables
load_dotenv()

# Configure Gemini API
GOOGLE_API_KEY = "AIzaSyB1whZlck89xDwjawOBsqPCpP8-V-oDwFM"  # Using the provided API key
genai.configure(api_key=GOOGLE_API_KEY)

# Initialize the LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-preview-05-20",  # Updated to correct model name
    temperature=0.7,
    google_api_key=GOOGLE_API_KEY,
    streaming=True
)

# Initialize the embeddings
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=GOOGLE_API_KEY
)

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
    pdf_pattern = os.path.join(r'C:\Users\dhruv\OneDrive\Documents\EY_RAG_Project\backend\pdfs', "*.pdf")
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

# Initialize vector store with PDFs
pdf_documents = load_pdfs_from_directory("backend/pdfs")
vectorstore = initialize_faiss_index(pdf_documents, embeddings)
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}
)

app = Flask(__name__)
CORS(app) # Enable CORS for all routes
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['TEMPLATES_AUTO_RELOAD'] = False  # Disable template auto-reloading
app.config['DEBUG'] = True  # Keep debug mode for development
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'supersecretkey')
app.config['SESSION_COOKIE_NAME'] = 'rag_chatbot_session_id'

# Configure logging to reduce noise
logging.getLogger('werkzeug').setLevel(logging.ERROR)  # Reduce werkzeug logging
logging.getLogger('watchdog').setLevel(logging.ERROR)  # Reduce watchdog logging

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

        # Select the appropriate instruction based on query type
        if is_detailed_query:
            selected_instruction = DETAILED_RESPONSE_INSTRUCTION
        elif is_comparison_query:
            selected_instruction = COMPARISON_INSTRUCTION
        else:
            selected_instruction = CORE_INSTRUCTION

    # Create the base prompt with core instructions and formatting guidelines
    base_prompt = f"""
{CORE_INSTRUCTION}

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
    
    # Define keywords for context-aware agent detection
    DPDP_KEYWORDS = ["data protection", "privacy", "dpdp act", "data privacy", "personal data"]
    PARLIAMENT_KEYWORDS = ["lok sabha", "parliamentary rules", "rules of procedure", "parliament", "parliament procedures"]

    # If agent_id is not explicitly set (i.e., no @mention from frontend), try to infer it
    if agent_id is None:
        lower_user_message = user_message.lower()
        if any(keyword in lower_user_message for keyword in DPDP_KEYWORDS):
            agent_id = 'DPDP'
            logger.info(f"Inferred agent: DPDP based on message keywords.")
        elif any(keyword in lower_user_message for keyword in PARLIAMENT_KEYWORDS):
            agent_id = 'Parliament'
            logger.info(f"Inferred agent: Parliament based on message keywords.")
        else:
            logger.info(f"No agent inferred based on message keywords. Proceeding with general query.")

    # Update the session's agentId if it was None and we have an inferred agent
    if sessions[session_id]['agentId'] is None and agent_id is not None:
        sessions[session_id]['agentId'] = agent_id
        save_sessions()  # Save the updated session with the inferred agent
    
    # Add messages to session with proper string conversion
    sessions[session_id]['messages'].append({
        'sender': 'user',
        'content': str(user_message),  # Ensure content is string
        'agentId': agent_id  # Store the agent ID received from frontend or inferred
    })
    
    # Get relevant context from documents
    all_docs = retriever.get_relevant_documents(user_message)
    logger.info(f"Retrieved {len(all_docs)} documents before agent filtering.")
    
    # Filter documents based on pdf_source_from_frontend if provided, else use agent_id
    docs = []
    if pdf_source_from_frontend:
        logger.info(f"Filtering documents by provided pdfSource: {pdf_source_from_frontend}")
        docs = [doc for doc in all_docs if doc.metadata.get('source') == pdf_source_from_frontend]
        if not docs and all_docs:
            logger.warning(f"No documents found for {pdf_source_from_frontend} matching query. Using all relevant documents as fallback.")
            docs = all_docs # Fallback to all documents if no specific ones found for pdfSource
    elif agent_id == 'DPDP':
        allowed_pdf_source = 'DPDP_act.pdf'
        docs = [doc for doc in all_docs if doc.metadata.get('source') == allowed_pdf_source]
        if not docs and all_docs:
             logger.warning(f"No documents found for DPDP_act.pdf matching query. Using all relevant documents as fallback.")
             docs = all_docs # Fallback to all documents if no specific ones found
    elif agent_id == 'Parliament':
        allowed_pdf_source = 'Rules_of_Procedures_Lok_Sabha.pdf'
        docs = [doc for doc in all_docs if doc.metadata.get('source') == allowed_pdf_source]
        if not docs and all_docs:
             logger.warning(f"No documents found for Rules_of_Procedures_Lok_Sabha.pdf matching query. Using all relevant documents as fallback.")
             docs = all_docs # Fallback to all documents if no specific ones found
    else:
        docs = all_docs # No agent or pdfSource specified, use all relevant documents
    
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
        
        # Construct the full path to the PDF file
        pdf_directory = r'C:\Users\dhruv\OneDrive\Documents\EY_RAG_Project\backend\pdfs' # Explicitly define
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

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept"],
        "expose_headers": ["X-PDF-Page", "X-PDF-Section"],
        "supports_credentials": True
    }
})

if __name__ == '__main__':
    print("Starting Flask app...") # Debug print to confirm app starts
    load_sessions()
    # You might want to remove debug=True in a production environment
    app.run(debug=True, port=5000) 