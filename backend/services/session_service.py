import logging
import uuid
from datetime import datetime, timezone

from services.ai_service import (
    validate_input,
    extract_text_from_image,
    clean_question,
    clean_idea_request,
    decompose_question,
    generate_hints,
    generate_idea_hints,
    generate_final_answer,
    generate_idea_final_guidance,
    check_attempt,
    check_idea_attempt,
    generate_explanation,
    generate_idea_explanation,
)
from storage.memory_store import store

logger = logging.getLogger(__name__)

RESPONSE_MODES = {"academic", "idea"}
IDEA_HINT_TITLES = ["Direction", "Building blocks", "Actionable scaffold"]


def normalize_response_mode(mode):
    """Return a supported response mode, defaulting legacy requests to academic."""
    if mode is None or str(mode).strip() == "":
        return "academic"

    normalized = str(mode).strip().lower()
    if normalized not in RESPONSE_MODES:
        raise ValueError("Invalid mode. Accepted values are 'academic' and 'idea'.")
    return normalized


def _session_mode(session):
    return normalize_response_mode(session.get("mode"))


def _hint_title(mode, hint_level):
    if mode == "idea" and 0 <= hint_level < len(IDEA_HINT_TITLES):
        return IDEA_HINT_TITLES[hint_level]
    return f"Hint {hint_level + 1}"


def _build_image_augmented_input(user_text, extracted_image_text, mode="academic"):
    """Combine typed text and vision-extracted content for the text pipeline."""
    if mode == "idea":
        parts = [
            "The user uploaded an image. A vision model extracted the following creative context:",
            extracted_image_text.strip(),
        ]
    else:
        parts = [
            "The user uploaded an image. A vision model extracted the following content:",
            extracted_image_text.strip(),
        ]

    if user_text and user_text.strip():
        parts.extend(["The user also typed:", user_text.strip()])

    return "\n\n".join(parts)


def create_session(raw_input, input_type, image_file, exam_mode, mode="academic"):
    """Create a new learning session."""
    mode = normalize_response_mode(mode)

    # Step 1: Get text from input
    if input_type == "image" and image_file:
        logger.info("Starting image input route for mode=%s.", mode)
        extracted_image_text = extract_text_from_image(image_file)
        raw_text = _build_image_augmented_input(raw_input, extracted_image_text, mode)
        logger.info("Image route extraction succeeded; continuing with text model pipeline.")
    else:
        logger.info("Starting text-only input route for mode=%s.", mode)
        raw_text = raw_input

    # Step 2: Validate
    validation = validate_input(raw_text, mode)
    if not validation["valid"]:
        return {"error": validation["message"]}

    # Step 3: Clean
    cleaned = clean_idea_request(raw_text) if mode == "idea" else clean_question(raw_text)

    # Step 4: Decompose
    sub_questions_raw = [cleaned] if mode == "idea" else decompose_question(cleaned)

    # Step 5: Build sub-question objects
    sub_questions = []
    for sq_text in sub_questions_raw:
        if mode == "idea":
            hints = generate_idea_hints(sq_text)
            final_answer = generate_idea_final_guidance(sq_text)
        else:
            hints = generate_hints(sq_text)
            final_answer = generate_final_answer(sq_text)
        logger.info("Final text generation succeeded for a sub-question.")
        sub_questions.append({
            "question": sq_text,
            "hints": hints,
            "final_answer": final_answer,
            "current_hint_level": 0,
            "attempts": [],
            "completed": False,
        })

    # Step 6: Create session
    session_id = str(uuid.uuid4())[:8]
    session = {
        "session_id": session_id,
        "original_input_type": input_type,
        "original_question": raw_text,
        "cleaned_question": cleaned,
        "sub_questions": sub_questions,
        "current_sub_question_index": 0,
        "exam_mode": exam_mode,
        "mode": mode,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    store[session_id] = session

    # Step 7: Return response with first sub-question and first hint
    first_sq = sub_questions[0]
    return {
        "session_id": session_id,
        "mode": mode,
        "validation": {"valid": True, "message": "Question accepted."},
        "cleaned_question": cleaned,
        "is_multi_part": len(sub_questions) > 1,
        "total_sub_questions": len(sub_questions),
        "current_sub_question_index": 0,
        "current_sub_question": first_sq["question"],
        "current_hint_level": 0,
        "current_hint_title": _hint_title(mode, 0),
        "current_hint": first_sq["hints"][0] if first_sq["hints"] else "No hints available.",
        "status": "active",
    }


def get_session_state(session_id):
    """Return the current state of a session."""
    if session_id not in store:
        return {"error": "Session not found."}

    session = store[session_id]
    mode = _session_mode(session)
    idx = session["current_sub_question_index"]
    sq = session["sub_questions"][idx]

    return {
        "session_id": session_id,
        "mode": mode,
        "cleaned_question": session["cleaned_question"],
        "is_multi_part": len(session["sub_questions"]) > 1,
        "total_sub_questions": len(session["sub_questions"]),
        "current_sub_question_index": idx,
        "current_sub_question": sq["question"],
        "current_hint_level": sq["current_hint_level"],
        "current_hint_title": _hint_title(mode, sq["current_hint_level"]),
        "current_hint": sq["hints"][sq["current_hint_level"]] if sq["hints"] and sq["current_hint_level"] < len(sq["hints"]) else "No more hints.",
        "status": session["status"],
    }


def get_next_hint(session_id):
    """Advance to the next hint level for the current sub-question."""
    if session_id not in store:
        return {"error": "Session not found."}

    session = store[session_id]
    mode = _session_mode(session)

    if session["status"] == "completed":
        return {"error": "This session is already completed."}

    idx = session["current_sub_question_index"]
    sq = session["sub_questions"][idx]

    if sq["completed"]:
        return {"error": "This sub-question is already completed."}

    if sq["current_hint_level"] >= 2:
        return {
            "hint_level": sq["current_hint_level"],
            "hint_title": _hint_title(mode, sq["current_hint_level"]),
            "hint": "No more hints available. Please attempt an answer.",
            "max_hints_reached": True,
        }

    sq["current_hint_level"] += 1
    new_level = sq["current_hint_level"]

    return {
        "hint_level": new_level,
        "hint_title": _hint_title(mode, new_level),
        "hint": sq["hints"][new_level] if new_level < len(sq["hints"]) else "No more hints.",
        "max_hints_reached": new_level >= 2,
    }


def submit_attempt(session_id, answer):
    """Check the student's answer for the current sub-question."""
    if session_id not in store:
        return {"error": "Session not found."}

    session = store[session_id]
    mode = _session_mode(session)

    if session["status"] == "completed":
        return {"error": "This session is already completed."}

    idx = session["current_sub_question_index"]
    sq = session["sub_questions"][idx]

    if sq["completed"]:
        return {"error": "This sub-question is already completed."}

    # Save attempt
    sq["attempts"].append(answer)

    # Check answer
    if mode == "idea":
        result = check_idea_attempt(sq["question"], answer, sq["final_answer"])
    else:
        result = check_attempt(sq["question"], answer, sq["final_answer"])

    if result["correct"]:
        sq["completed"] = True
        if mode == "idea":
            explanation = generate_idea_explanation(sq["question"], sq["final_answer"])
        else:
            explanation = generate_explanation(sq["question"], sq["final_answer"])

        # Check if there are more sub-questions
        if idx + 1 < len(session["sub_questions"]):
            next_idx = idx + 1
            session["current_sub_question_index"] = next_idx
            next_sq = session["sub_questions"][next_idx]

            return {
                "correct": True,
                "feedback": result["feedback"],
                "explanation": explanation,
                "sub_question_completed": True,
                "session_completed": False,
                "next_sub_question_index": next_idx,
                "next_sub_question": next_sq["question"],
                "next_hint_level": 0,
                "next_hint_title": _hint_title(mode, 0),
                "next_hint": next_sq["hints"][0] if next_sq["hints"] else "No hints available.",
                "status": "active",
            }
        else:
            session["status"] = "completed"
            return {
                "correct": True,
                "feedback": result["feedback"],
                "explanation": explanation,
                "sub_question_completed": True,
                "session_completed": True,
                "status": "completed",
            }
    else:
        return {
            "correct": False,
            "feedback": result["feedback"],
            "sub_question_completed": False,
            "session_completed": False,
            "current_hint_level": sq["current_hint_level"],
            "hints_remaining": 2 - sq["current_hint_level"],
            "status": "active",
        }


def reveal_answer(session_id):
    """Reveal the final answer for the current sub-question, if allowed."""
    if session_id not in store:
        return {"error": "Session not found."}

    session = store[session_id]
    mode = _session_mode(session)
    idx = session["current_sub_question_index"]
    sq = session["sub_questions"][idx]

    if session["exam_mode"]:
        return {"error": "Answer reveal is disabled in exam mode."}

    if len(sq["attempts"]) == 0:
        return {"error": "You must attempt the question at least once before revealing the answer."}

    return {
        "answer": sq["final_answer"],
        "mode": mode,
        "sub_question_index": idx,
        "sub_question": sq["question"],
    }
