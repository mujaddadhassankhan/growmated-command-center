# Growmated Command Center (Custom Web App Starter)

This is a starter Next.js app designed to replace the Excel workbook with a working application.

## What’s included
- Next.js App Router UI with a clean, founder-friendly Dashboard
- Tailwind styling + your color system
- Supabase client wiring (you bring the Supabase project)
- A SQL schema to create the tables that match your Excel model
- Netlify config for Next.js builds

## Setup (high level)
1) Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2) Set environment variables in Netlify (or locally) using `.env.example`.
3) Deploy to Netlify (Git-based deploy).

## Notes
- The Dashboard loads real data from Supabase tables.
- The other pages are scaffolded placeholders so you can build CRUD screens next.

If you want, we can extend this into a full CRUD app with:
- login (Supabase Auth)
- client/project views
- overdue alerts
- outreach follow-up reminders
- weekly review screen
