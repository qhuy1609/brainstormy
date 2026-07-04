import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from routes.learning_routes import learning_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(learning_bp, url_prefix="/api/session")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
AI_TEXT_MODEL = os.getenv("AI_TEXT_MODEL", "").strip()
AI_IMAGE_MODEL = os.getenv("AI_IMAGE_MODEL", "").strip()

if not OPENROUTER_API_KEY:
    print("WARNING: OPENROUTER_API_KEY is not set. Add it to backend/.env before starting a learning session.")


@app.route("/api/health", methods=["GET"])
def health():
    return {
        "status": "ok",
        "ai_configured": bool(OPENROUTER_API_KEY and AI_TEXT_MODEL and AI_IMAGE_MODEL),
        "text_model": AI_TEXT_MODEL,
        "image_model": AI_IMAGE_MODEL,
    }, 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
