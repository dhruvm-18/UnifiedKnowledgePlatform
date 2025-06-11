# Unified Knowledge Platform

A React-based chat application with agent selection and document summarization features. The platform allows users to interact with specialized AI agents to get insights from various knowledge sources.

## Features

- Interactive chat interface with AI agents
- Support for multiple knowledge sources
- Document summarization capabilities
- Agent selection and management
- PDF document viewing and navigation
- Voice input support
- Dark/Light theme support

## Tech Stack

- Frontend: React.js
- Backend: Python (Flask)
- PDF Processing: pdf.js
- Styling: CSS3 with custom theming

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Python 3.8 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd EY_RAG_Project
```

2. Install frontend dependencies:
```bash
cd react-frontend
npm install
```

3. Set up Python virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. Start the development servers:

Frontend:
```bash
cd react-frontend
npm start
```

Backend:
```bash
python app.py
```

## Project Structure

```
EY_RAG_Project/
├── react-frontend/          # React frontend application
│   ├── src/                # Source files
│   ├── public/             # Static files
│   └── package.json        # Frontend dependencies
├── venv/                   # Python virtual environment
├── requirements.txt        # Python dependencies
└── app.py                 # Backend server
```

## Version Control

This project uses Git for version control. Here are some common commands:

```bash
# Check status of changes
git status

# Stage changes
git add <file>  # Stage specific file
git add .       # Stage all changes

# Commit changes
git commit -m "Your commit message"

# Push changes to remote
git push origin main
```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

[Your License Here]

## Contact

[Your Contact Information] 