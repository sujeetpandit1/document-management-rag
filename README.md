# Document Management RAG System

A NestJS-based document management system with Retrieval-Augmented Generation (RAG) capabilities.

## Features

- **Authentication**: JWT-based authentication system
- **User Management**: CRUD operations for user accounts with role-based access
- **Document Management**: Store, retrieve, and manage documents
- **Document Ingestion**: Process and index documents for search
- **RAG Integration**: Retrieval-Augmented Generation capabilities for document queries
- **Database**: PostgreSQL with TypeORM integration
- **API Documentation**: Postman collection included

## Technologies

- [NestJS](https://nestjs.com/) - Framework
- [TypeORM](https://typeorm.io/) - Database ORM
- [PostgreSQL](https://www.postgresql.org/) - Database
- [JWT](https://jwt.io/) - Authentication
- [Docker](https://www.docker.com/) - Containerization

## Project Structure and Module Descriptions

```
src/
├── auth/               # Authentication module
├── common/             # Shared utilities and guards
├── database/           # Database configuration and migrations
├── documents/          # Document management
├── ingestion/          # Document ingestion processing
├── users/              # User management
└── utils/              # Utility functions
```

### Module Details

#### Authentication (`auth/`)
- **Purpose**: Handles user authentication and authorization
- **Key Components**:
  - JWT strategy for secure token-based authentication
  - Login and registration endpoints
  - Guards for route protection
- **Effect**: Ensures only authenticated users can access protected routes and verifies user permissions

#### Common Utilities (`common/`)
- **Purpose**: Shared functionality across modules
- **Key Components**:
  - Role-based access control (RBAC) decorators
  - Custom guards for authorization
  - Enums for consistent role definitions
- **Effect**: Reduces code duplication and maintains consistency in authorization logic

#### Database (`database/`)
- **Purpose**: Database connection and schema management
- **Key Components**:
  - TypeORM data source configuration
  - Database initialization scripts
  - Migration files for schema evolution
- **Effect**: Provides reliable data persistence and schema versioning

#### Document Management (`documents/`)
- **Purpose**: Core RAG functionality for document operations
- **Key Components**:
  - CRUD operations for documents
  - Document entity definition
  - File storage integration
- **Effect**: Enables storing, retrieving and managing documents for the RAG system

#### Ingestion Pipeline (`ingestion/`)
- **Purpose**: Processes and indexes uploaded documents
- **Key Components**:
  - Document parsing and chunking
  - Vector embedding generation
  - Search index updates
- **Effect**: Prepares documents for efficient retrieval and question answering

#### User Management (`users/`)
- **Purpose**: Manages user accounts and profiles
- **Key Components**:
  - User CRUD operations
  - Role assignment
  - Profile management
- **Effect**: Maintains system users and their permissions

#### Utilities (`utils/`)
- **Purpose**: Global helper functions and error handling
- **Key Components**:
  - Global error handler
  - Common utility functions
- **Effect**: Provides consistent error responses and shared functionality

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- PostgreSQL
- Docker (optional)

### Installation

1. Clone the repository:
   git clone https://github.com/sujeetpandit1/document-management-rag.git
   cd document-management-backend
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (create `.env` file):
   ```
   PORT=5001
   BACKEND_URL=http://nestjs-backend:5001
   PYTHON_BACKEND_URL=http://python-backend:6000

   DATABASE_HOST=postgres
   DATABASE_PORT=5432
   DATABASE_USERNAME=postgres
   DATABASE_PASSWORD=YourStrongPassword
   DATABASE_NAME=your db name

   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRATION=1h
   UPLOAD_DIR=./uploads
   ```

### Running the Application

#### Development
```bash
npm run start:dev
```

#### Production
```bash
npm run build
npm run start:prod
```

#### Docker
```bash
docker-compose up --build
```

### Testing

Run unit tests:
```bash
npm run test
```

Run e2e tests:
```bash
npm run test:e2e
```

## API Documentation

A Postman collection (`postman_collection.json`) is included in the root directory for API testing and documentation.

The API endpoints are grouped into the following modules:
Authentication

POST /api/auth/register - Register a new user
POST /api/auth/login - Authenticate and get JWT token

Users

GET /api/users - Get all users (Admin only)
GET /api/users/me - Get user by ID (Admin only)
PATCH /api/users/update - Update user (Admin only)
DELETE /api/users - Delete user (Admin only)

Documents

POST /api/documents - Upload a new document (Admin, Editor)
GET /api/documents - Get all documents
GET /api/documents/my - Get documents uploaded by current user
GET /api/documents/:id - Get document by ID
PATCH /api/documents/:id - Update document (Admin, Editor)
DELETE /api/documents/:id - Delete document (Admin only)

Ingestion

POST /api/ingestion/trigger - Trigger ingestion process (Admin, Editor)
POST /api/ingestion/callback - Callback for Python backend
GET /api/ingestion - Get all ingestion processes (Admin only)
GET /api/ingestion/my - Get ingestion processes triggered by current user
GET /api/ingestion/:id - Get ingestion process by ID

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

[MIT](UNLICENCED)
