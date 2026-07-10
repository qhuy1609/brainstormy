from flask import Blueprint, request, jsonify
from ai.image_model import ImageInputError
from ai.openrouter import (
    AIConfigError,
    AIEmptyResponseError,
    AIRateLimitError,
    AIServiceError,
    AIUnsupportedImageError,
)
from services.session_service import (
    create_session,
    get_session_state,
    get_next_hint,
    submit_attempt,
    reveal_answer,
    normalize_response_mode,
)

learning_bp = Blueprint("learning", __name__)


def _ai_error_response(error):
    if isinstance(error, ImageInputError):
        return jsonify({"error": str(error)}), 400
    if isinstance(error, AIConfigError):
        return jsonify({"error": str(error)}), 503
    if isinstance(error, AIRateLimitError):
        return jsonify({"error": str(error)}), 429
    if isinstance(error, AIUnsupportedImageError):
        return jsonify({"error": str(error)}), 400
    if isinstance(error, AIEmptyResponseError):
        return jsonify({"error": str(error)}), 502
    if isinstance(error, AIServiceError):
        return jsonify({"error": str(error)}), 502
    return None


@learning_bp.route("/start", methods=["POST"])
def start_session():
    text = request.form.get("question", "").strip()
    image = request.files.get("image")
    exam_mode = request.form.get("exam_mode", "false").lower() == "true"
    try:
        mode = normalize_response_mode(request.form.get("mode"))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if not text and not image:
        return jsonify({"error": "Please provide a question or upload an image."}), 400

    input_type = "image" if image else "text"
    raw_input = text if text else ""

    try:
        result = create_session(raw_input, input_type, image, exam_mode, mode)
        if "error" in result:
            return jsonify(result), 400
        return jsonify(result), 201
    except Exception as e:
        ai_error = _ai_error_response(e)
        if ai_error:
            return ai_error
        return jsonify({"error": "Internal server error."}), 500


@learning_bp.route("/<session_id>", methods=["GET"])
def fetch_session(session_id):
    try:
        result = get_session_state(session_id)
        if "error" in result:
            return jsonify(result), 404
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


@learning_bp.route("/<session_id>/hint", methods=["POST"])
def fetch_hint(session_id):
    try:
        result = get_next_hint(session_id)
        if "error" in result:
            return jsonify(result), 400
        return jsonify(result), 200
    except Exception as e:
        ai_error = _ai_error_response(e)
        if ai_error:
            return ai_error
        return jsonify({"error": "Internal server error."}), 500


@learning_bp.route("/<session_id>/attempt", methods=["POST"])
def attempt_answer(session_id):
    data = request.get_json(silent=True) or {}
    answer = data.get("answer", "").strip()

    if not answer:
        return jsonify({"error": "Answer cannot be empty."}), 400

    try:
        result = submit_attempt(session_id, answer)
        if "error" in result:
            return jsonify(result), 400
        return jsonify(result), 200
    except Exception as e:
        ai_error = _ai_error_response(e)
        if ai_error:
            return ai_error
        return jsonify({"error": "Internal server error."}), 500


@learning_bp.route("/<session_id>/reveal", methods=["POST"])
def reveal(session_id):
    try:
        result = reveal_answer(session_id)
        if "error" in result:
            return jsonify(result), 403
        return jsonify(result), 200
    except Exception as e:
        ai_error = _ai_error_response(e)
        if ai_error:
            return ai_error
        return jsonify({"error": "Internal server error."}), 500
