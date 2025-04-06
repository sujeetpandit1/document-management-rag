# Document Management and RAG-based Q&A Application - Backend

This repository contains the NestJS backend service for a document management and RAG-based Q&A application. It handles user authentication, document management, and integration with a Python backend for document ingestion and embedding generation.

## Features

- User authentication with JWT
- Role-based access control (Admin, Editor, Viewer)
- Document management with file upload
- Document ingestion process management
- Integration with Python backend for RAG processing

## Requirements

- Node.js 18+
- PostgreSQL 15+
- Docker and Docker Compose (for containerized deployment)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd document-management-backend