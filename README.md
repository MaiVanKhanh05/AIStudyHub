# AI Study Hub

AI Study Hub is a web-based learning platform that helps users upload, manage, search, and interact with study documents using Artificial Intelligence.

## Features

### Authentication & User Management

* User registration and login
* JWT-based authentication
* Role-based access control (Admin/User)
* Password recovery and profile management

### Document Management

* Upload documents (PDF, DOCX, XLSX, PPTX)
* View documents directly in browser
* Edit document metadata
* Delete documents
* Bookmark/Favorite documents
* Search and filter documents

### AI-Powered Learning

* AI Chat based on uploaded documents
* AI Quiz Generator
* AI Study Assistant
* Context-aware document Q&A

### Sharing & Collaboration

* Share documents with other users
* Manage sharing permissions
* Notification center for shared resources

### Admin Dashboard

* User management
* Document moderation
* System statistics and analytics

---

## Tech Stack

### Frontend

* ReactJS
* TypeScript
* Tailwind CSS
* Redux Toolkit
* React Router

### Backend

* Node.js
* Express.js
* TypeScript
* JWT Authentication

### Database

* PostgreSQL
* Prisma ORM

### Storage

* Supabase Storage

### AI Integration

* OpenAI API

---

## Project Structure

```bash
AI-Study-Hub/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── routes/
│   └── package.json
│
├── docs/
├── database/
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/your-username/ai-study-hub.git
cd ai-study-hub
```

### Backend Setup

```bash
cd backend

npm install
```

Create `.env` file:

```env
PORT=5000

DATABASE_URL=

JWT_SECRET=

OPENAI_API_KEY=

SUPABASE_URL=

SUPABASE_ANON_KEY=
```

Run backend:

```bash
npm run dev
```

---

### Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend will run at:

```bash
http://localhost:5173
```

---

## API Documentation

Example API endpoints:

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
```

### Documents

```http
GET    /api/documents
POST   /api/documents
PUT    /api/documents/:id
DELETE /api/documents/:id
```

### AI

```http
POST /api/ai/chat
POST /api/ai/generate-quiz
```

---

## Business Modules

| Module                  | Description                    |
| ----------------------- | ------------------------------ |
| Authentication          | Login, Register, JWT           |
| User Management         | Profile and account management |
| Document Management     | Upload, edit, delete, search   |
| AI Chat                 | Ask questions from documents   |
| AI Quiz Generator       | Generate quizzes automatically |
| Sharing & Collaboration | Share documents                |
| Notifications           | User notifications             |
| Admin Dashboard         | System administration          |

---

## Future Enhancements

* OCR support
* AI-powered summaries
* Learning progress tracking
* Real-time collaboration
* Mobile application

---

## Contributors

* Project Team – AI Study Hub

---

## License

This project is licensed under the MIT License.
