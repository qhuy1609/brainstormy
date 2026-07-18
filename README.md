# brainstormy

**Think better with AI-not less.**

brainstormy is a learning and ideation workspace designed to keep people actively involved in their thinking. Instead of immediately producing a finished result, it helps users test an answer, ask for a useful nudge, or develop an early idea into a practical direction.

The project combines a Flask API with a Vite and React frontend. AI requests are sent through OpenRouter using one configurable, vision-capable model.

## Modes

### Academic mode

- Type a study question, upload an image, or provide both.
- See the broad concepts connected to the question.
- Request a conceptual hint before attempting an answer.
- Submit working and a final answer for two focused checks: whether the working is going the right way and whether the answer is correct.
- Ask for a targeted hint or reveal a complete worked solution after making an attempt.

### Idea mode

- Start with a rough project, writing, design, naming, campaign, or presentation idea.
- Answer a small set of adaptive discovery questions or generate ideas immediately.
- Compare a personalized shortlist of distinct directions.
- Select up to two ideas and turn them into a practical development brief with focus areas and next steps.

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer
- An [OpenRouter](https://openrouter.ai/) API key
- An OpenRouter model that supports text, image input, and structured JSON responses

## Quick start

Clone the repository, then configure and run the backend and frontend in separate terminals.

### Windows PowerShell

Backend:

```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.user .env
```

Open `backend/.env`, replace the placeholder API key with your own, then start Flask:

```powershell
python app.py
```

Frontend, from the repository root in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

### macOS or Linux

Backend:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.user .env
```

Open `backend/.env`, replace the placeholder API key with your own, then start Flask:

```bash
python app.py
```

Frontend, from the repository root in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Once both servers are running:

- Marketing page: `http://localhost:5173/`
- Academic and Idea workspace: `http://localhost:5173/app`
- Backend health check: `http://localhost:5000/api/health`

## Environment variables

Copy [`backend/.env.user`](backend/.env.user) to `backend/.env`. The completed `.env` file is ignored by Git and must never be committed.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | Authenticates requests to OpenRouter. Use your own key. |
| `AI_TEXT_MODEL` | Yes | Selects the vision-capable model used for validation, image understanding, tutoring, and idea generation. |

The included template uses:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
AI_TEXT_MODEL=google/gemini-3.1-flash-lite
```

You can replace `AI_TEXT_MODEL` with another compatible OpenRouter model.

## Development commands

Run backend commands from `backend/`:

| Command | Purpose |
| --- | --- |
| `python app.py` | Start the Flask API on port 5000. |
| `python -m unittest discover -s tests -p "test_*.py"` | Run the backend test suite. |

Run frontend commands from `frontend/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server on port 5173. |
| `npm test` | Run the frontend tests with Node's test runner. |
| `npm run build` | Create a production bundle in `frontend/dist/`. |
| `npm run preview` | Preview the production bundle locally. |

Tests mock OpenRouter calls and do not require an API key or network access.

## Supported input

- Typed text
- JPEG, PNG, or WebP images smaller than 8 MB
- An image together with additional typed context

The selected `AI_TEXT_MODEL` must support image input for uploaded questions or creative references.

## Architecture

```text
brainstormy/
├── backend/
│   ├── ai/          # OpenRouter client and model adapters
│   ├── routes/      # Flask HTTP endpoints
│   ├── services/    # Academic and Idea workflows
│   ├── storage/     # In-memory session store
│   ├── tests/       # Backend unit tests
│   └── app.py       # API entry point and health check
└── frontend/
    ├── src/
    │   ├── api/     # API request helpers
    │   └── components/
    ├── index.html
    └── vite.config.js
```

The frontend renders Markdown and LaTeX responses with React Markdown and KaTeX. The backend validates structured AI output before returning it to the client.

## Current limitations and production readiness

The repository is configured for local development. Before deploying it publicly:

- Replace the frontend's hardcoded `http://localhost:5000/api/session` API base with an environment-based production URL.
- Run Flask behind a production WSGI server instead of the built-in debug server.
- Replace the in-memory session store if sessions must survive restarts or work across multiple backend instances.
- Configure the frontend host with an SPA fallback so direct requests to `/app` serve `frontend/dist/index.html`.
- Restrict CORS to the deployed frontend origin.

Refreshing the app starts a fresh composer, and restarting the backend clears all current sessions.

## Troubleshooting

### The backend reports a missing API key or model

Confirm that `backend/.env` exists and contains both required values, then restart the backend. Do not rename `.env.user`; it is only the shareable template.

### PowerShell blocks virtual-environment activation

You can run the virtual environment's Python directly without activating it:

```powershell
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe app.py
```

### An image upload fails

Check the file format and size, then confirm that the selected OpenRouter model accepts image input.

### OpenRouter returns a rate-limit or availability error

Wait and retry, or configure a different compatible `AI_TEXT_MODEL` in `backend/.env`, then restart the backend.

### Frontend changes do not appear

Restart `npm run dev` and hard-refresh the browser. On Windows with Chrome or Edge, use `Ctrl+F5`.
