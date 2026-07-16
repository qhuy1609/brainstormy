# brainstormy

**An AI tutor that protects your thinking, not replaces it.**

brainstormy accepts a typed homework question, an uploaded image, or both. It validates that the request is study-related, splits multi-part questions when needed, gives progressive hints, checks student attempts, and reveals the final answer only when allowed.

## What changed in this build

- All AI calls now go through OpenRouter.
- Text-only questions use `AI_TEXT_MODEL`.
- Image uploads use `AI_IMAGE_MODEL` first to extract structured question content, then `AI_TEXT_MODEL` for the normal tutor pipeline.
- Typed text can be sent together with an uploaded image and is combined with the image extraction before final reasoning.
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
# OpenRouter API key used for both text and image models
OPENROUTER_API_KEY=

# Used for normal text-only questions and final reasoning
AI_TEXT_MODEL=deepseek/deepseek-chat-v3.1

# Used only when the user uploads an image or the request contains image input
AI_IMAGE_MODEL=google/gemini-2.5-flash-lite
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
| `OPENROUTER_API_KEY` | Yes | `sk-or-...` | OpenRouter API key used for both text and image models. |
| `AI_TEXT_MODEL` | Yes | `deepseek/deepseek-chat-v3.1` | Model used for text-only questions and final tutor reasoning. |
| `AI_IMAGE_MODEL` | Yes | `google/gemini-2.5-flash-lite` | Vision-capable model used only to read uploaded images. |

## AI routing

Text-only flow:

```text
User text question -> OpenRouter + AI_TEXT_MODEL -> normal tutor session
```

Image flow:

```text
Uploaded image -> OpenRouter + AI_IMAGE_MODEL for extraction
               -> extracted structured text plus any typed text
               -> OpenRouter + AI_TEXT_MODEL for validation, cleanup, hints, answers, and feedback
```

The text model is the final reasoning model. Raw images are not sent to the text model by default.

## Text, Markdown, and math rendering

The frontend uses:

- `react-markdown`
- `remark-math`
- `rehype-katex`
- `katex`

This is why AI responses containing Markdown or LaTeX, such as `**work**` or `$E_p = mgh$`, render properly in the browser. The `MathText.jsx` component also normalizes common escaped AI output like `\$...\$`, `\(...\)`, and one-line numbered explanations.

## Project structure

```text
brainstormy/
  backend/
    ai/
      openrouter.py
      text_model.py
      image_model.py
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
- Image-only question: upload a jpg, png, or webp and confirm the backend logs image extraction followed by text generation.
- Text plus image: upload an image while leaving typed text in the textarea and confirm both are included in the session question.
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

Use `jpg`, `jpeg`, `png`, or `webp` images under 8 MB. Also check that `AI_IMAGE_MODEL` is a vision-capable OpenRouter model.

### Text generation is rate-limited

Try a different `AI_TEXT_MODEL` in `backend/.env`, then restart the backend.

### Changes do not show in browser

Stop the frontend dev server and restart it:

```bash
npm run dev
```

Then hard-refresh the browser. On Windows/Chrome, press `Ctrl + F5`.
