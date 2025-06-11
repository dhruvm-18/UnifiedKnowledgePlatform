# Error Handling

This document provides comprehensive information about error handling in the EY RAG Project.

## HTTP Status Codes

The API uses standard HTTP status codes to indicate the success or failure of requests:

### Success Codes
- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `204 No Content`: Request succeeded, no response body

### Client Error Codes
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded

### Server Error Codes
- `500 Internal Server Error`: Unexpected server error
- `502 Bad Gateway`: Error from upstream service
- `503 Service Unavailable`: Service temporarily unavailable

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

## Common Error Codes

### API Errors

| Code | Description | Resolution |
|------|-------------|------------|
| `INVALID_REQUEST` | Invalid request parameters | Check request format and parameters |
| `SESSION_NOT_FOUND` | Session ID not found | Verify session ID or create new session |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement exponential backoff |
| `PDF_PROCESSING_ERROR` | Error processing PDF | Verify PDF format and content |
| `AI_SERVICE_ERROR` | Error from Gemini AI service | Check API key and service status |

### System Errors

| Code | Description | Resolution |
|------|-------------|------------|
| `VECTOR_STORE_ERROR` | Error accessing vector store | Check FAISS index integrity |
| `FILE_SYSTEM_ERROR` | Error accessing files | Verify file permissions |
| `MEMORY_ERROR` | Insufficient memory | Reduce batch size or optimize memory usage |
| `NETWORK_ERROR` | Network connectivity issues | Check network connection |

## Error Handling Best Practices

### Client-Side

1. **Implement Retry Logic**
   ```javascript
   const MAX_RETRIES = 3;
   const RETRY_DELAY = 1000;

   async function fetchWithRetry(url, options) {
     for (let i = 0; i < MAX_RETRIES; i++) {
       try {
         const response = await fetch(url, options);
         if (response.ok) return response;
         
         if (response.status === 429) {
           const delay = RETRY_DELAY * Math.pow(2, i);
           await new Promise(resolve => setTimeout(resolve, delay));
           continue;
         }
         
         throw new Error(`HTTP error! status: ${response.status}`);
       } catch (error) {
         if (i === MAX_RETRIES - 1) throw error;
       }
     }
   }
   ```

2. **Handle Rate Limiting**
   ```javascript
   function handleRateLimit(response) {
     const limit = response.headers.get('X-RateLimit-Limit');
     const remaining = response.headers.get('X-RateLimit-Remaining');
     const reset = response.headers.get('X-RateLimit-Reset');
     
     if (remaining === '0') {
       const waitTime = (reset - Date.now()) / 1000;
       console.log(`Rate limit reached. Please wait ${waitTime} seconds.`);
     }
   }
   ```

### Server-Side

1. **Logging**
   ```python
   import logging

   logger = logging.getLogger(__name__)

   def handle_error(error):
       logger.error(f"Error occurred: {str(error)}", exc_info=True)
       return jsonify({
           "error": {
               "code": error.code,
               "message": str(error)
           }
       }), error.status_code
   ```

2. **Error Recovery**
   ```python
   def recover_from_error(error):
       if isinstance(error, VectorStoreError):
           return reinitialize_vector_store()
       elif isinstance(error, PDFProcessingError):
           return cleanup_temp_files()
       return None
   ```

## Troubleshooting Guide

### Common Issues and Solutions

1. **PDF Processing Failures**
   - Verify PDF is not corrupted
   - Check PDF permissions
   - Ensure PDF is text-based (not scanned)

2. **AI Service Issues**
   - Verify API key is valid
   - Check service status
   - Monitor rate limits

3. **Vector Store Problems**
   - Check disk space
   - Verify index integrity
   - Monitor memory usage

### Debugging Tools

1. **Logging**
   - Enable debug logging
   - Check application logs
   - Monitor error rates

2. **Monitoring**
   - Track API response times
   - Monitor resource usage
   - Set up alerts for errors

## Support

For additional help with error handling:
1. Check the [FAQs](./faqs.md)
2. Review the [API Reference](./api-reference.md)
3. Contact support with error details 