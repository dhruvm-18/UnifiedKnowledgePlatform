# Getting Started

This guide will help you set up and run the EY RAG Project on your local machine.

## Prerequisites

- Python 3.8 or higher
- Node.js 14.0 or higher
- npm or yarn package manager
- Google Cloud account with Gemini API access
- Git

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd EY_RAG_Project
```

### 2. Backend Setup

1. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following:
```
GOOGLE_API_KEY=your_gemini_api_key
```

### 3. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd react-frontend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### 1. Start the Backend Server
```bash
# From the root directory
python backend.py
```
The backend server will start on `http://localhost:5000`

### 2. Start the Frontend Development Server
```bash
# From the react-frontend directory
npm start
```
The frontend will be available at `http://localhost:3000`

## Initial Configuration

1. Place your PDF documents in the `backend/pdfs` directory
2. The application will automatically process and index these documents on startup
3. Access the web interface through your browser at `http://localhost:3000`

## Verifying the Installation

1. Open the web interface
2. Create a new chat session
3. Upload a PDF document or use existing documents
4. Ask a question to verify the RAG functionality

## Common Issues

- If you encounter CORS issues, ensure both frontend and backend servers are running
- For PDF processing errors, verify that the PDF files are not corrupted and are readable
- If the Gemini API is not responding, check your API key and internet connection

## Next Steps

- Review the [Architecture Overview](./architecture.md) to understand the system design
- Check the [API Reference](./api-reference.md) for available endpoints
- Read the [FAQs](./faqs.md) for common questions and solutions 