# RAG (Retrieval-Augmented Generation) Implementation

## 6.1 Overview of RAG Methodology

### Core Components
- **Retrieval System**: FAISS-based vector store for efficient document retrieval
- **Generation System**: Google's Gemini AI for response generation
- **Integration Layer**: LangChain for orchestrating the RAG pipeline

### Workflow
1. Document ingestion and embedding
2. Query processing and context retrieval
3. Response generation with retrieved context
4. Response formatting and source attribution

## 6.2 Retriever Configuration

### Similarity Search
- **Search Type**: Similarity-based retrieval
- **Top-K**: 5 most relevant documents
- **Search Parameters**:
  ```python
  retriever = vectorstore.as_retriever(
      search_type="similarity",
      search_kwargs={"k": 5}
  )
  ```

### Document Filtering
- Source-based filtering for agent-specific responses
- Metadata-based filtering for document type
- Page-level granularity for precise context retrieval

### Performance Optimizations
- CPU-based processing with 4 threads
- In-memory index management
- Batch processing support
- Automatic index updates

## 6.3 Generator Configuration

### LLM Setup
- **Model**: Gemini 2.5 Flash Preview
- **Configuration**:
  ```python
  llm = ChatGoogleGenerativeAI(
      model="gemini-2.5-flash-preview-05-20",
      temperature=0.7,
      streaming=True
  )
  ```

### Prompt Strategy
- **Dynamic Prompt Selection**:
  - Core instruction for general queries
  - Specialized prompts for:
    - Detailed responses
    - Comparisons
    - Technical explanations
    - Greetings
    - Summarizations

- **Prompt Structure**:
  1. Context source identification
  2. Retrieved context
  3. User query
  4. Formatting instructions
  5. Response guidelines

## 6.4 Evaluation of Answer Relevance and Coherence

### Relevance Assessment
- Context-source alignment verification
- Query-context matching evaluation
- Source citation accuracy

### Coherence Metrics
- Response structure adherence
- Logical flow verification
- Context integration quality

### Quality Controls
- Source attribution requirements
- Format compliance checks
- Response completeness validation

## 6.5 Response Formatting and Confidence Scoring

### Response Structure
- **Standard Format**:
  1. Direct answer to query
  2. Supporting details
  3. Source citations
  4. Additional context if relevant

### Specialized Formats
- **Comparison Responses**:
  - Markdown tables for structured comparison
  - Detailed analysis following table
  - Source citations for each comparison point

- **Technical Responses**:
  - Technical specifications
  - Implementation details
  - Best practices
  - Code examples when applicable

### Source Attribution
- **Format**: `pdf://<filename>/page/<page_number>#section=<section_name>`
- **Example**: `pdf://DPDP_act.pdf/page/9#section=Section_1`
- **Mandatory Requirements**:
  - Every response must include a Sources section
  - Sources must be properly formatted
  - Page and section references must be accurate

### Confidence Indicators
- Source-based confidence scoring
- Context relevance indicators
- Response completeness assessment 