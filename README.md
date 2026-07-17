# brainstormy

**An AI tutor that protects your thinking, not replaces it.**

brainstormy accepts a typed homework question, an uploaded image, or both. It validates that the request is study-related, asks users to submit multi-part work one question at a time, gives adaptive hints, diagnoses attempts, and can reveal a worked solution after an attempt.

## What changed in this build

- All AI calls now go through OpenRouter.
- Every AI call uses one vision-capable `AI_TEXT_MODEL`.
- Academic image uploads are extracted and validated in one multimodal call.
- Idea-mode image uploads use the same model to extract creative context before discovery.
- API secrets are kept in `backend/.env`, which should not be committed to Git.

## Requirements

- Python 3.10+
- Node.js 18+
- An OpenRouter API key

## 1. Backend setup

Open a terminal in the project folder:

```bash
cd backend
python -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # On Windows: copy .env.example .env
```

Open `backend/.env` and configure OpenRouter:

```env
# OpenRouter API key
OPENROUTER_API_KEY=

# Must support text, image input, and structured JSON
AI_TEXT_MODEL=google/gemini-3.1-flash-lite
```

Start the backend:

```bash
python app.py
```

Backend runs on:

```text
http://localhost:5000
```

## 2. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

The frontend exposes two browser routes:

- `/` is the brainstormy marketing landing page.
- `/app` is the interactive Academic and Idea mode workspace.

Production hosting must use an SPA fallback that serves `frontend/dist/index.html` for direct requests to `/app` and other client-side routes. Refreshing `/app` intentionally starts a fresh composer because sessions are currently held in memory.

Open that URL in your browser and try a question such as:

```text
Derive the equation E_p = mgh for the potential energy change of a mass m moved through a vertical distance h near Earth's surface.
```

## API configuration

The backend reads these environment variables from `backend/.env`:

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | `sk-or-...` | OpenRouter API key. |
| `AI_TEXT_MODEL` | Yes | `google/gemini-3.1-flash-lite` | Vision-capable model used for text, images, structured validation, and tutoring. |

## AI routing

Text-only flow:

```text
User text question -> OpenRouter + AI_TEXT_MODEL validation -> tutor session
```

Image flow:

```text
Academic image -> OpenRouter + AI_TEXT_MODEL for extraction and validation in one call
Idea image     -> OpenRouter + AI_TEXT_MODEL for creative-context extraction
               -> normal Idea discovery flow
```

The configured model must accept image input. Academic images and any accompanying typed context are sent together.

## Text, Markdown, and math rendering

The frontend uses:

- `react-markdown`
- `remark-math`
- `rehype-katex`
- `katex`

This is why AI responses containing Markdown or LaTeX, such as `$E_p = mgh$` and `$$E_p = mgh$$`, render properly in the browser. The math normalizer also accepts legacy `\(...\)` and `\[...\]` delimiters.

## Project structure

```text
brainstormy/
  backend/
    ai/
      openrouter.py
      text_model.py
      image_input.py
    app.py
    requirements.txt
    .env.example
    routes/
    services/
    storage/
  frontend/
    package.json
    index.html
    src/
      App.jsx
      main.jsx
      api/
      components/
        MathText.jsx
```

## Sanity checks

- Text-only question: submit text without an image and confirm the backend logs the text route and selected text model.
- Academic image: upload a jpg, png, or webp and confirm one multimodal validation call is logged.
- Text plus image: upload an image with typed context and confirm both are included in the accepted question.
- Missing env vars: temporarily remove one required variable from `backend/.env`, restart the backend, and confirm the frontend receives a readable config error.
- Rate limit: if OpenRouter returns 429, the frontend should show a model-specific rate-limit message.

## Common issues

### Backend says `OPENROUTER_API_KEY` is missing

Check that the file is named exactly:

```text
backend/.env
```

and contains:

```env
OPENROUTER_API_KEY=your_openrouter_key_here
```

Restart the backend after editing `.env`.

### Image upload fails

Use `jpg`, `jpeg`, `png`, or `webp` images under 8 MB. Also check that `AI_TEXT_MODEL` is a vision-capable OpenRouter model.

### Text generation is rate-limited

Try a different `AI_TEXT_MODEL` in `backend/.env`, then restart the backend.

### Changes do not show in browser

Stop the frontend dev server and restart it:

```bash
npm run dev
```

Then hard-refresh the browser. On Windows/Chrome, press `Ctrl + F5`.
