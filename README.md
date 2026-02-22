# Helpora Website

This is the full codebase for **Helpora**, an on-demand services marketplace connecting users with local professionals.

## Project Structure

- `frontend/`: Contains all client-side code (HTML, CSS, Vanilla JS) for the public website and dashboards.
  - `index.html`: Main homepage.
  - `styles.css`: Dark theme styling, responsive design.
  - `script.js`, `auth.js`, etc.: UI Interactivity and API integration logic.
- `backend/`: Contains the Node.js/Express server and API endpoints. 
  - `server.js`: The entry point for the backend server. Also serves the static frontend files.
  - `routes/`, `controllers/`: Handles authentication, bookings, and Supabase database interactions.

## How to Run

1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Add a `.env` file in the `backend/` directory with the necessary Supabase configuration and JWT secrets.
4. Start the development server: `npm start`
5. Visit the app seamlessly in your browser at `http://localhost:5000`

## Features

- **Mobile-First Design**: Optimized for phone screens.
- **Premium User Experience**: Deep purple gradients and glassmorphism effects.
- **Full Authentication**: Sign up, Login, and personalized user/provider dashboards.
