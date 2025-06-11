# API Reference

This document provides detailed information about the REST API endpoints available in the EY RAG Project.

## Base URL

All API endpoints are relative to the base URL:
```
http://localhost:5000
```

## Authentication

The API uses session-based authentication. Each request should include a valid session ID in the URL path.

## Endpoints

### Sessions

#### Get All Sessions
```http
GET /sessions
```

**Response**
```json
[
  {
    "id": "uuid",
    "title": "New Chat 1",
    "createdAt": "2024-03-20T10:00:00Z",
    "messages": []
  }
]
```

#### Create Session
```http
POST /sessions
```

**Response**
```json
{
  "id": "uuid",
  "title": "New Chat 1",
  "createdAt": "2024-03-20T10:00:00Z",
  "messages": []
}
```

#### Delete Session
```http
DELETE /sessions/{session_id}
```

**Response**
- 204 No Content (success)
- 404 Not Found (session doesn't exist)

#### Update Session
```http
PUT /sessions/{session_id}
```

**Request Body**
```json
{
  "title": "Updated Chat Title"
}
```

**Response**
```json
{
  "id": "uuid",
  "title": "Updated Chat Title",
  "createdAt": "2024-03-20T10:00:00Z",
  "messages": []
}
```

### Messages

#### Get Session Messages
```http
GET /sessions/{session_id}/messages
```

**Response**
```json
[
  {
    "id": "message_id",
    "content": "Message content",
    "role": "user|assistant",
    "timestamp": "2024-03-20T10:00:00Z",
    "sources": [
      {
        "text": "Source text",
        "page": 1,
        "document": "document_name.pdf"
      }
    ]
  }
]
```

#### Add Message
```http
POST /sessions/{session_id}/messages
```

**Request Body**
```json
{
  "content": "User message",
  "role": "user"
}
```

**Response**
```json
{
  "id": "message_id",
  "content": "AI response",
  "role": "assistant",
  "timestamp": "2024-03-20T10:00:00Z",
  "sources": [
    {
      "text": "Source text",
      "page": 1,
      "document": "document_name.pdf"
    }
  ]
}
```

### Documents

#### Serve PDF
```http
GET /pdfs/{filename}
```

**Response**
- PDF file content
- 404 Not Found (file doesn't exist)

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request parameters"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. Current limits:
- 100 requests per minute per IP
- 1000 requests per hour per IP

## Response Headers

All responses include the following headers:
- `Content-Type: application/json`
- `X-Request-ID`: Unique request identifier
- `X-RateLimit-Limit`: Maximum requests per time window
- `X-RateLimit-Remaining`: Remaining requests in current time window

## Best Practices

1. **Error Handling**
   - Always check response status codes
   - Handle rate limiting errors gracefully
   - Implement retry logic for transient failures

2. **Session Management**
   - Create new sessions for different contexts
   - Clean up unused sessions
   - Handle session expiration

3. **Message Processing**
   - Keep messages concise and clear
   - Include relevant context
   - Handle streaming responses appropriately 