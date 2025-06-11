# Frequently Asked Questions (FAQs)

## General Questions

### What is the EY RAG Project?
The EY RAG Project is a Retrieval-Augmented Generation (RAG) application that combines document processing with AI-powered question answering. It uses Google's Gemini AI to provide intelligent responses based on the content of your documents.

### What types of documents are supported?
Currently, the application supports PDF documents. The PDFs should be text-based (not scanned images) for optimal processing.

### Is there a limit to the number of documents I can process?
There are no strict limits, but performance may be affected by:
- Total size of documents
- Available system memory
- Vector store capacity

## Technical Questions

### How do I get started with the API?
1. Set up your environment (see [Getting Started](./getting-started.md))
2. Obtain a Google Gemini API key
3. Configure your environment variables
4. Start the backend and frontend servers

### How does the document processing work?
1. PDFs are uploaded to the system
2. Text is extracted and processed
3. Content is converted to embeddings
4. Embeddings are stored in the FAISS vector store
5. Similarity search is used to retrieve relevant content

### What is the response time for queries?
Response times vary based on:
- Query complexity
- Document size
- System load
- Network conditions

Typical response times range from 1-5 seconds.

## Usage Questions

### How do I create a new chat session?
```http
POST /sessions
```
The system will return a session ID that you can use for subsequent requests.

### How do I ask questions about my documents?
1. Create a session
2. Upload your documents
3. Send your question using:
```http
POST /sessions/{session_id}/messages
```

### Can I use multiple documents in one session?
Yes, you can process multiple documents in a single session. The system will search across all uploaded documents to find relevant information.

## Troubleshooting

### The system is not responding to my queries
Check the following:
1. Verify your API key is valid
2. Ensure documents are properly uploaded
3. Check system logs for errors
4. Verify network connectivity

### I'm getting rate limit errors
The system implements rate limiting to prevent abuse. If you hit the limit:
1. Implement exponential backoff
2. Reduce request frequency
3. Contact support for higher limits

### PDF processing is failing
Common causes and solutions:
1. Corrupted PDF files
2. Scanned PDFs (not text-based)
3. Permission issues
4. Memory constraints

## Security

### How is my data protected?
- All data is processed locally
- No data is stored permanently
- API keys are secured
- Session-based authentication

### Are my documents stored permanently?
No, documents are processed in memory and not stored permanently. You'll need to re-upload documents when restarting the system.

## Performance

### How can I optimize performance?
1. Use text-based PDFs
2. Keep documents concise
3. Implement caching
4. Monitor system resources

### What are the system requirements?
Minimum requirements:
- 4GB RAM
- 2 CPU cores
- 1GB free disk space
- Python 3.8+
- Node.js 14+

## Integration

### Can I integrate this with my existing system?
Yes, the system provides a REST API that can be integrated with:
- Web applications
- Mobile apps
- Desktop applications
- Other services

### Are there any SDKs available?
Currently, the system is accessible via REST API. SDKs may be developed in the future based on demand.

## Support

### How do I get help?
1. Check the documentation
2. Review error logs
3. Contact support with:
   - Error messages
   - System logs
   - Steps to reproduce

### Where can I report bugs?
Bugs can be reported through:
1. GitHub issues
2. Support email
3. Bug report form

## Future Development

### What features are planned?
Upcoming features include:
1. Support for more document types
2. Enhanced search capabilities
3. Custom model fine-tuning
4. Advanced analytics

### How can I contribute?
Contributions are welcome through:
1. Pull requests
2. Bug reports
3. Feature requests
4. Documentation improvements 