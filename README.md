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
