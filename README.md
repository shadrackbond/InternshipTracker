# Internship Application Tracker

A private, Notion-inspired workspace for managing internship applications, deadlines, interviews, contacts, application materials, and offers. Built with Next.js, TypeScript, Tailwind CSS, and MongoDB.

## Features

- Overview dashboard with application, pipeline, interview, offer, and response-rate metrics
- Searchable and filterable applications database
- Full application records covering opportunity, progress, materials, contacts, interviews, assessments, and offers
- Upcoming deadlines and follow-up reminders
- Dedicated interview and contact views
- Add, edit, inspect, and delete applications
- Editable candidate profile with role, location, eligibility, and work-mode preferences
- Private multi-version CV library backed by MongoDB GridFS
- Server-side PDF text extraction with reviewable skill suggestions
- Primary CV selection for future job-matching workflows
- MongoDB persistence
- Password-protected single-owner access
- Responsive light interface

## Requirements

- Node.js 20.16 or newer
- A MongoDB Atlas database or another MongoDB deployment
- A Vercel account for deployment

## Local setup

1. Extract the project and open its directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local`.
4. Replace the placeholder values in `.env.local`.
5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000` and sign in with your `TRACKER_ACCESS_KEY`.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string. Keep this secret. |
| `MONGODB_DB` | Yes | Database name, such as `internship_tracker`. |
| `TRACKER_ACCESS_KEY` | Yes | Password used to open the private tracker. |
| `SESSION_SECRET` | Yes | Long random secret used to sign the session cookie. |
| `NEXT_PUBLIC_OWNER_NAME` | No | Name displayed in the interface. |

Generate a session secret with:

```bash
openssl rand -base64 32
```

## MongoDB Atlas setup

1. Create a free MongoDB Atlas cluster.
2. Create a database user with a strong password.
3. Under **Network Access**, allow connections from Vercel. The straightforward option is `0.0.0.0/0`; use a strong database password because this permits network access from any IP.
4. Copy the Node.js connection string from **Connect → Drivers**.
5. Replace the username, password, and cluster details, then store the result as `MONGODB_URI`.

The application creates the `applications` collection automatically when the first application is saved.

## Deploy to Vercel

1. Push the extracted project to a GitHub repository.
2. In Vercel, select **Add New → Project** and import the repository.
3. Keep the detected framework as **Next.js**.
4. Add all variables from `.env.example` under **Settings → Environment Variables**.
5. Deploy the project.

After changing an environment variable, redeploy so the new value is applied.

## Available commands

```bash
npm run dev      # Start local development
npm run build    # Create a production build
npm run start    # Run the production build
npm run lint     # Run code-quality checks
```

## Security notes

- Never commit `.env.local` or your MongoDB credentials.
- Use a unique `TRACKER_ACCESS_KEY` and a randomly generated `SESSION_SECRET`.
- This edition is designed as a single-owner tracker. Add a full identity provider before allowing multiple independent users.
