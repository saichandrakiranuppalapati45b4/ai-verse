# AI Verse Club Portal
# ARCHITECTURE.md

**Version:** 1.0.0

This document defines the complete technical architecture for the AI Verse Club Portal. It describes how the application is structured, the technologies used, the folder organization, authentication flow, database design, and coding standards.

---

# 1. Architecture Overview

The AI Verse Club Portal follows a modern client-side architecture using React and Firebase.

```
                    Internet
                        │
                        ▼
              Firebase Hosting
                        │
                        ▼
                React + Vite App
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
 Firebase Auth     Cloud Firestore   Firebase Storage
        │               │               │
        └───────────────┼───────────────┘
                        │
                  Role-Based Access
```

---

# 2. Technology Stack

## Frontend

- React 19+
- Vite
- TypeScript
- Tailwind CSS
- React Router DOM
- React Hook Form
- Zod
- Framer Motion
- Lucide React Icons

---

## Backend (BaaS)

Firebase

Services Used:

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Hosting

---

## Development Tools

- VS Code
- Git
- GitHub
- ESLint
- Prettier

---

# 3. Folder Structure

```
src/

│
├── assets/
│   ├── images/
│   ├── icons/
│   └── logos/
│
├── components/
│   ├── common/
│   ├── layout/
│   ├── ui/
│   ├── forms/
│   ├── cards/
│   ├── tables/
│   ├── modals/
│   └── dashboard/
│
├── pages/
│   ├── public/
│   ├── auth/
│   ├── organizer/
│   ├── faculty/
│   └── errors/
│
├── layouts/
│
├── routes/
│
├── services/
│
├── firebase/
│
├── hooks/
│
├── context/
│
├── types/
│
├── utils/
│
├── constants/
│
├── styles/
│
├── App.tsx
│
└── main.tsx
```

---

# 4. Application Layers

## Presentation Layer

Contains:

- Pages
- Components
- Layouts

Responsibilities:

- User Interface
- Forms
- Tables
- Navigation

---

## Business Logic Layer

Contains:

- Services
- Hooks
- Context

Responsibilities:

- CRUD Operations
- Authentication
- Data Validation
- API Communication

---

## Data Layer

Firebase Services

- Firestore
- Authentication
- Storage

---

# 5. Routing Architecture

## Public Routes

```
/

about

events

events/:id

gallery

team

contact

login

404
```

---

## Organizer Routes

```
/organizer

/organizer/dashboard

/organizer/events

/organizer/gallery

/organizer/team

/organizer/announcements

/organizer/registrations

/organizer/profile
```

---

## Faculty Routes

```
/faculty

/faculty/dashboard

/faculty/events

/faculty/team

/faculty/users

/faculty/analytics

/faculty/settings

/faculty/profile
```

---

# 6. Layout Structure

## Public Layout

```
Navbar

↓

Page Content

↓

Footer
```

---

## Dashboard Layout

```
Sidebar

↓

Topbar

↓

Main Content

↓

Footer
```

---

# 7. Authentication Architecture

Authentication Method:

Firebase Authentication

Supported Methods:

- Email + Password

Future:

- Google Login
- Microsoft Login

---

Authentication Flow

```
Login

↓

Firebase Auth

↓

Get User UID

↓

Fetch User Profile

↓

Determine Role

↓

Redirect Dashboard
```

---

# 8. Authorization

Role-Based Access Control (RBAC)

Available Roles

```
Public

Student

Organizer

Faculty
```

Permissions are determined using the `role` field in the user document.

---

# 9. Firestore Database Structure

## Collections

```
users

events

registrations

gallery

announcements

team

contacts
```

---

## users

```
id

name

email

role

photoURL

department

year

status

createdAt
```

---

## events

```
id

title

description

category

venue

startDate

endDate

registrationDeadline

poster

status

createdBy

createdAt
```

---

## registrations

```
id

eventId

userId

name

email

phone

branch

year

registeredAt
```

---

## gallery

```
id

title

category

imageURL

eventId

uploadedBy

uploadedAt
```

---

## announcements

```
id

title

content

priority

published

createdBy

createdAt
```

---

## team

```
id

name

position

department

photoURL

linkedin

github

displayOrder
```

---

## contacts

```
id

name

email

subject

message

status

createdAt
```

---

# 10. Firebase Storage Structure

```
storage/

events/

gallery/

team/

posters/

documents/

profile-images/
```

---

# 11. Services Layer

Services

```
auth.service.ts

event.service.ts

gallery.service.ts

announcement.service.ts

registration.service.ts

team.service.ts

contact.service.ts

user.service.ts

storage.service.ts
```

Each service handles:

- Create
- Read
- Update
- Delete
- Error Handling

---

# 12. State Management

Use React Context.

Contexts

```
AuthContext

ThemeContext
```

Future

```
NotificationContext

SettingsContext
```

Avoid unnecessary global state.

Use local component state whenever possible.

---

# 13. Component Architecture

Hierarchy

```
Page

↓

Section

↓

Feature Component

↓

Reusable UI Component
```

Example

```
Events Page

↓

Event List

↓

Event Card

↓

Button
```

---

# 14. Reusable Components

```
Button

Input

Textarea

Select

Modal

Card

Badge

Avatar

Loader

Toast

Pagination

Table

Search Bar

Empty State

Error State
```

---

# 15. Form Validation

Use:

- React Hook Form
- Zod

Validation should occur:

- Client Side
- Before Submission

---

# 16. Error Handling

Application should handle

- Authentication errors
- Network failures
- Permission denied
- Invalid forms
- Missing data
- File upload failures

Show friendly error messages.

Never expose Firebase errors directly.

---

# 17. Loading Strategy

Every async operation must display:

- Loading Spinner
- Skeleton Loader

Examples:

- Login
- Fetch Events
- Upload Images
- Dashboard Loading

---

# 18. Image Handling

Images stored in Firebase Storage.

Metadata stored in Firestore.

Supported Formats

- PNG
- JPG
- JPEG
- WEBP

Maximum upload size should be configurable.

---

# 19. Security Architecture

Authentication Required

- Organizer Dashboard
- Faculty Dashboard

Public Access

- Home
- About
- Events
- Gallery
- Team
- Contact

Protected using:

- Protected Routes
- Firestore Security Rules
- Storage Rules

---

# 20. Environment Variables

```
VITE_FIREBASE_API_KEY

VITE_FIREBASE_AUTH_DOMAIN

VITE_FIREBASE_PROJECT_ID

VITE_FIREBASE_STORAGE_BUCKET

VITE_FIREBASE_MESSAGING_SENDER_ID

VITE_FIREBASE_APP_ID
```

Never commit secrets to Git.

Use `.env.local` for development.

---

# 21. Performance Strategy

Use

- Lazy Loading
- Code Splitting
- Image Optimization
- Route-based Loading
- Component Memoization (only when needed)

Avoid unnecessary re-renders.

---

# 22. Responsive Design

Supported Devices

- Mobile
- Tablet
- Laptop
- Desktop

Use Tailwind responsive breakpoints.

Mobile-first development is mandatory.

---

# 23. Accessibility

Minimum Requirements

- Semantic HTML
- Keyboard Navigation
- ARIA Labels
- Color Contrast Compliance
- Focus Indicators
- Alt Text for Images

---

# 24. Coding Standards

- TypeScript only
- Functional Components
- Hooks only
- No class components
- No inline styles
- Reusable components first
- Strict typing
- Consistent naming conventions

Naming

Components

```
EventCard.tsx
```

Pages

```
EventsPage.tsx
```

Hooks

```
useAuth.ts
```

Services

```
event.service.ts
```

Types

```
event.types.ts
```

---

# 25. Deployment

Hosting

Firebase Hosting

Database

Cloud Firestore

Storage

Firebase Storage

Authentication

Firebase Authentication

Domain

Custom Domain (Future)

---

# 26. Future Scalability

Architecture should support

- Multiple clubs
- Multiple faculty coordinators
- Alumni portal
- Member dashboard
- Event certificates
- Attendance system
- AI chatbot
- Push notifications
- Mobile application
- Admin analytics
- REST API integration

The codebase should remain modular so that new features can be added with minimal impact on existing modules.

---

# End of Document