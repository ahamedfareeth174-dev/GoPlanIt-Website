# GoPlanIt-Website
Build a static website for student planning using codex 
[README.md](https://github.com/user-attachments/files/28521831/README.md)
# GoPlanIt

GoPlanIt is a browser-based student planner made by Ahamed Fareeth.

It helps students organize assignments, exams, reminders, notes, study sessions, and weekly priorities from one local web app.

## Creator

Made by Ahamed Fareeth  
LinkedIn: https://www.linkedin.com/in/ahamed-fareeth-ba6659257/

## Features

- Account signup and login with local browser storage
- Username support
- Forgot-password reset for the local demo account
- Private planner pages protected behind login
- Monthly calendar with task pop-ups
- Dashboard with today's reminders, weekly view, and today's focus
- Notes workspace
- Global search after login
- Study timer, study materials, fake AI summaries, and quiz generation
- Local backup export/import
- Demo planner data from the homepage

## Data Storage

This project stores data in the browser using `localStorage` and IndexedDB where available. It does not use a remote server. If browser data is cleared, saved planner data may be removed.

Use the dashboard backup tools to export a JSON backup before moving devices or clearing browser data.

## Running Locally

Open `index.html` in a browser.

Because this is a static HTML/CSS/JavaScript app, it can also be served from any simple static server.

## Free Deployment Options

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- Firebase Hosting

For the easiest upload, Netlify drag-and-drop or GitHub Pages are good choices.

## Suggested Entry Page

Use `index.html` as the site entry point.
