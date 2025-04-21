# Data Processing Portal

A web application for processing files, executing jobs, and managing logs. Built with Next.js frontend and FastAPI backend.

## Features

- File Processing
  - Convert files to Parquet format
  - Convert files to SAS7BDAT format
- Log Management
  - View application logs
  - View job-specific logs
- Job Execution
  - Execute SAS jobs (20 predefined jobs)
  - Execute Big Data jobs (20 predefined jobs)
  - Extract database
  - Insert into database

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- SAS environment (for SAS jobs)
- Apache Spark (for Big Data jobs)

## Setup

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at http://localhost:3000

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   python main.py
   ```

The backend API will be available at http://localhost:8000

## API Documentation

Once the backend is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
data-portal/
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   └── Navigation.tsx
│   └── package.json
├── backend/
│   ├── main.py
│   └── requirements.txt
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 

MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=data_portal
