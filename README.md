# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4261cdf8-4a1c-460e-9037-346d76019a8f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4261cdf8-4a1c-460e-9037-346d76019a8f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies for the frontend.
npm i

# Step 4: Start the frontend development server with auto-reloading and an instant preview.
npm run dev
```

## How to start the backend (FastAPI)

The backend is located in the `backend` folder and uses FastAPI (Python).

1. Open a terminal and navigate to the `backend` directory:

   ```powershell
   cd backend
   ```

2. (Optional) Create and activate a virtual environment:

   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate
   ```

3. Install the required Python packages:

   ```powershell
   pip install fastapi uvicorn
   ```

4. Start the backend server:

   ```powershell
   uvicorn backend:main:app --reload
   ```

The backend will be available at http://localhost:8000

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4261cdf8-4a1c-460e-9037-346d76019a8f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Troubleshooting: BOM Comparison Failed to Fetch

If you see a "BOM comparison failed: Failed to fetch" error, follow these steps:

1. **Start the backend server**
   - Open a terminal and run:
     ```powershell
     uvicorn backend:main:app --reload
     ```
   - Make sure it says "Uvicorn running on http://127.0.0.1:8000".

2. **Start the frontend dev server**
   - In a separate terminal, run:
     ```powershell
     npm run dev
     ```
   - Open http://localhost:8080 in your browser.

3. **Check Vite proxy configuration**
   - The project is set up to proxy `/compare-bom` requests to the backend. If you changed ports or backend address, update `vite.config.ts` accordingly.

4. **If you still see the error:**
   - Make sure nothing else is using port 8000 (backend) or 8080 (frontend).
   - Check your browser console for CORS or network errors.
   - Ensure both servers are running and accessible.

If you need to change the backend address, update the `proxy` section in `vite.config.ts`.

