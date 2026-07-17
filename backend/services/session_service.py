import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from services.ai_service import (
    validate_input,
    validate_academic_request,
    extract_idea_context_from_image,
    clean_idea_request,
    detect_idea_language,
    infer_academic_response_type,
    infer_required_concepts,
    generate_initial_academic_hint,
    diagnose_academic_attempt,
    generate_targeted_academic_hint,
    generate_worked_solution,
    plan_idea_discovery,
    generate_personalized_ideas,
    generate_idea_development_brief,
)
from storage.memory_store import store

logger = logging.getLogger(__name__)

RESPONSE_MODES = {"academic", "idea"}
IDEA_STAGES = {
    "collecting_broad_context",
    "collecting_problem_context",
    "collecting_constraints",
    "ideas_generated",
    "developing_selected_idea",
}
IDEA_MAX_ROUNDS = 3


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


def _build_image_augmented_input(user_text, extracted_image_text, mode="academic"):
    """Combine typed text and vision-extracted content for the text pipeline."""
    label = "creative context" if mode == "idea" else "content"
    parts = [
        f"The user uploaded an image. A vision model extracted the following {label}:",
        extracted_image_text.strip(),
    ]
    if user_text and user_text.strip():
        parts.extend(["The user also typed:", user_text.strip()])
    return "\n\n".join(parts)


def _idea_stage(round_number: int) -> str:
    if round_number <= 1:
        return "collecting_broad_context"
    if round_number == 2:
        return "collecting_problem_context"
    return "collecting_constraints"


def _merge_context(existing: dict[str, list[str]], incoming: dict[str, list[str]]) -> dict[str, list[str]]:
    merged = {key: list(values) for key, values in existing.items()}
    for key, values in incoming.items():
        merged[key] = list(dict.fromkeys([*merged.get(key, []), *values]))[:5]
    return merged


def _context_dimension_count(context: dict[str, list[str]]) -> int:
    return sum(1 for values in context.values() if values)


def _idea_flow_response(session: dict[str, Any]) -> dict[str, Any]:
    flow = session["idea_flow"]
    return {
        "session_id": session["session_id"],
        "mode": "idea",
        "status": session["status"],
        "cleaned_question": session["cleaned_question"],
        "idea_flow": {
            "stage": flow["stage"],
            "round": flow["round"],
            "max_rounds": IDEA_MAX_ROUNDS,
            "summary": flow["summary"],
            "task_profile": flow["task_profile"],
            "reason": flow.get("reason", ""),
            "known_context": flow["known_context"],
            "missing_context": flow["missing_context"],
            "questions": flow.get("current_questions", []),
            "can_generate_now": flow.get("can_generate_now", True),
            "assumptions": flow.get("assumptions", []),
            "ideas": flow.get("ideas", []),
            "selected_idea_ids": flow.get("selected_idea_ids", []),
            "development_brief": flow.get("development_brief"),
        },
    }


def _plan_next_idea_round(session: dict[str, Any], round_number: int) -> None:
    flow = session["idea_flow"]
    previous_questions = [
        {
            "round": item["round"],
            "questions": item["questions"],
            "answers": item.get("answers", []),
        }
        for item in flow["question_rounds"]
    ]
    plan = plan_idea_discovery(
        flow["original_request"], flow["known_context"], previous_questions, round_number, flow["task_profile"]
    )
    flow["known_context"] = _merge_context(flow["known_context"], plan["known_context"])
    flow["task_profile"] = {**plan["task_profile"], "language": flow["task_profile"]["language"]}
    flow["missing_context"] = plan["missing_context"]
    flow["summary"] = plan["summary"]
    flow["reason"] = plan["reason"]
    flow["assumptions"] = plan.get("assumptions", [])
    flow["ready_to_generate"] = plan.get("ready_to_generate", False)
    flow["round"] = round_number
    flow["stage"] = _idea_stage(round_number)
    flow["current_questions"] = plan["questions"]
    flow["can_generate_now"] = True


def _generate_idea_shortlist(session: dict[str, Any], assumptions: list[str] | None = None) -> None:
    flow = session["idea_flow"]
    if assumptions is not None:
        flow["assumptions"] = assumptions
    flow["ideas"] = [
        {"id": f"idea_{index + 1}", **idea}
        for index, idea in enumerate(
            generate_personalized_ideas(
                flow["original_request"], flow["task_profile"], flow["known_context"], flow["assumptions"]
            )
        )
    ]
    flow["stage"] = "ideas_generated"
    flow["current_questions"] = []
    flow["missing_context"] = []
    session["status"] = "active"


def _create_idea_session(raw_text: str, input_type: str, exam_mode: bool) -> dict[str, Any]:
    cleaned = clean_idea_request(raw_text, force_llm_cleanup=input_type == "image")
    session_id = str(uuid.uuid4())[:8]
    session = {
        "session_id": session_id,
        "original_input_type": input_type,
        "original_question": raw_text,
        "cleaned_question": cleaned,
        "exam_mode": False,
        "mode": "idea",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "idea_flow": {
            "original_request": cleaned,
            "stage": "collecting_broad_context",
            "round": 1,
            "summary": cleaned,
            "reason": "A few choices will help tailor a useful shortlist.",
            "task_profile": {"task_type": "general", "requested_deliverable": cleaned, "generation_style": "task-appropriate concept directions", "language": detect_idea_language(cleaned)},
            "known_context": {},
            "missing_context": [],
            "question_rounds": [],
            "current_questions": [],
            "can_generate_now": True,
            "ready_to_generate": False,
            "assumptions": [],
            "ideas": [],
            "selected_idea_ids": [],
            "development_brief": None,
        },
    }
    _plan_next_idea_round(session, 1)
    if session["idea_flow"]["ready_to_generate"] or _context_dimension_count(session["idea_flow"]["known_context"]) >= 4:
        _generate_idea_shortlist(session)
    store[session_id] = session
    return _idea_flow_response(session)


def create_session(raw_input, input_type, image_file, exam_mode, mode="academic"):
    """Create an academic session or an adaptive Idea-mode session."""
    mode = normalize_response_mode(mode)
    if mode == "academic":
        logger.info("Starting unified Academic validation for input_type=%s.", input_type)
        validation = validate_academic_request(raw_input, image_file if input_type == "image" else None)
        raw_text = raw_input
    else:
        if input_type == "image" and image_file:
            logger.info("Extracting Idea-mode image context with the unified text model.")
            extracted_image_text = extract_idea_context_from_image(image_file)
            raw_text = _build_image_augmented_input(raw_input, extracted_image_text, mode)
        else:
            raw_text = raw_input
        validation = validate_input(raw_text, mode)

    if not validation["valid"]:
        return {
            "error": validation["message"],
            "status": validation.get("status", "invalid"),
            "validation": validation,
        }
    if mode == "idea":
        return _create_idea_session(raw_text, input_type, exam_mode)

    cleaned = validation["cleaned_question"]
    response_type = infer_academic_response_type(cleaned)
    session_id = str(uuid.uuid4())[:8]
    session = {
        "session_id": session_id,
        "original_input_type": input_type,
        "original_question": raw_input,
        "question": cleaned,
        "cleaned_question": cleaned,
        "required_concepts": infer_required_concepts(cleaned),
        "exam_mode": exam_mode,
        "mode": mode,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "academic_flow": {
            "stage": "initial_attempt",
            "response_type": response_type,
            "attempts": [],
            "hints": [],
            "worked_solution": None,
        },
    }
    store[session_id] = session
    return _academic_flow_response(session)


def _academic_flow_response(session: dict[str, Any]) -> dict[str, Any]:
    flow = session["academic_flow"]
    return {
        "session_id": session["session_id"],
        "mode": "academic",
        "question": session["question"],
        "cleaned_question": session["cleaned_question"],
        "requiredConcepts": session.get("required_concepts", []),
        "status": session["status"],
        "stage": flow["stage"],
        "response_type": flow["response_type"],
        "attempt_count": len(flow["attempts"]),
        "hint_available": session["status"] != "completed",
        "current_hint": flow["hints"][-1] if flow["hints"] else None,
        "worked_solution": flow["worked_solution"],
    }


def get_session_state(session_id):
    """Return the current state of a session."""
    if session_id not in store:
        return {"error": "Session not found."}
    session = store[session_id]
    if _session_mode(session) == "idea":
        return _idea_flow_response(session)
    return _academic_flow_response(session)


def _validate_idea_answers(flow: dict[str, Any], answers: Any) -> list[dict[str, Any]]:
    questions = flow.get("current_questions", [])
    if not isinstance(answers, list) or len(answers) != len(questions):
        raise ValueError("Please answer each discovery question or generate ideas now.")
    question_by_id = {question["id"]: question for question in questions}
    cleaned_answers = []
    seen = set()
    for item in answers:
        if not isinstance(item, dict):
            raise ValueError("Discovery answers must be structured.")
        question_id = str(item.get("question_id") or "")
        if question_id not in question_by_id or question_id in seen:
            raise ValueError("Discovery answers do not match the current questions.")
        seen.add(question_id)
        question = question_by_id[question_id]
        selected = item.get("selected_options") or []
        if not isinstance(selected, list):
            raise ValueError("Selected options must be a list.")
        selected = [str(option).strip() for option in selected if str(option).strip()]
        custom = str(item.get("custom_answer") or "").strip()
        if question["type"] == "short_text":
            if not custom:
                raise ValueError("Please provide a short answer for each discovery question.")
            selected = []
        else:
            if question["type"] == "single_select" and len(selected) != 1:
                raise ValueError("Please select one option for each single-select question.")
            if question["type"] == "multi_select" and not selected:
                raise ValueError("Please select at least one option for each multi-select question.")
            if any(option not in question["options"] for option in selected):
                raise ValueError("One or more selected options are invalid.")
            if custom and not question["allow_custom_answer"]:
                raise ValueError("This question does not accept a custom answer.")
            if "Other" in selected and question["allow_custom_answer"] and not custom:
                raise ValueError("Please describe your other answer.")
        cleaned_answers.append({
            "question_id": question_id,
            "selected_options": selected,
            "custom_answer": custom,
        })
    return cleaned_answers


def submit_idea_answers(session_id: str, answers: Any) -> dict[str, Any]:
    if session_id not in store:
        return {"error": "Session not found."}
    session = store[session_id]
    if _session_mode(session) != "idea":
        return {"error": "Discovery answers are only available in Idea mode."}
    flow = session["idea_flow"]
    if flow["stage"] not in IDEA_STAGES - {"ideas_generated", "developing_selected_idea"}:
        return {"error": "This Idea session cannot accept more discovery answers."}
    cleaned_answers = _validate_idea_answers(flow, answers)
    flow["question_rounds"].append({
        "round": flow["round"], "questions": flow["current_questions"], "answers": cleaned_answers,
    })
    next_round = flow["round"] + 1
    if next_round > IDEA_MAX_ROUNDS:
        _generate_idea_shortlist(session)
    else:
        _plan_next_idea_round(session, next_round)
        if flow.get("ready_to_generate") or _context_dimension_count(flow["known_context"]) >= 4:
            _generate_idea_shortlist(session)
    return _idea_flow_response(session)


def generate_idea_now(session_id: str) -> dict[str, Any]:
    if session_id not in store:
        return {"error": "Session not found."}
    session = store[session_id]
    if _session_mode(session) != "idea":
        return {"error": "Idea generation is only available in Idea mode."}
    flow = session["idea_flow"]
    if flow["stage"] in {"ideas_generated", "developing_selected_idea"}:
        return _idea_flow_response(session)
    assumptions = flow.get("assumptions") or ["Missing preferences were treated as flexible options."]
    _generate_idea_shortlist(session, assumptions)
    return _idea_flow_response(session)


def develop_selected_ideas(session_id: str, idea_ids: Any) -> dict[str, Any]:
    if session_id not in store:
        return {"error": "Session not found."}
    session = store[session_id]
    if _session_mode(session) != "idea":
        return {"error": "Idea development is only available in Idea mode."}
    flow = session["idea_flow"]
    if flow["stage"] not in {"ideas_generated", "developing_selected_idea"}:
        return {"error": "Generate ideas before selecting one to develop."}
    if not isinstance(idea_ids, list) or not 1 <= len(idea_ids) <= 2:
        return {"error": "Select one or two ideas to develop."}
    selected_ids = [str(idea_id) for idea_id in idea_ids]
    if len(set(selected_ids)) != len(selected_ids):
        return {"error": "Select distinct ideas to develop."}
    ideas_by_id = {idea["id"]: idea for idea in flow["ideas"]}
    if any(idea_id not in ideas_by_id for idea_id in selected_ids):
        return {"error": "One or more selected ideas are unavailable."}
    selected = [ideas_by_id[idea_id] for idea_id in selected_ids]
    flow["selected_idea_ids"] = selected_ids
    flow["development_brief"] = generate_idea_development_brief(
        flow["original_request"], flow["task_profile"], flow["known_context"], selected
    )
    flow["stage"] = "developing_selected_idea"
    return _idea_flow_response(session)


def get_next_hint(session_id):
    """Generate an initial or attempt-targeted Academic hint."""
    if session_id not in store:
        return {"error": "Session not found."}
    session = store[session_id]
    if _session_mode(session) == "idea":
        return {"error": "Idea sessions use discovery questions instead of hints."}
    if session["status"] == "completed":
        return {"error": "This session is already completed."}
    flow = session["academic_flow"]
    if not flow["attempts"]:
        hint = generate_initial_academic_hint(session["question"], flow["response_type"])
    else:
        latest = flow["attempts"][-1]
        hint = generate_targeted_academic_hint(
            session["question"], latest["text"], latest["diagnosis"], flow["hints"]
        )
    flow["hints"].append(hint)
    flow["stage"] = "feedback_received" if flow["attempts"] else "initial_attempt"
    return {"hint": hint, "current_hint": hint, "stage": flow["stage"], "hint_count": len(flow["hints"])}


def submit_attempt(session_id, answer):
    """Diagnose an Academic answer for the current question."""
    if session_id not in store:
        return {"error": "Session not found."}
    session = store[session_id]
    if _session_mode(session) == "idea":
        return {"error": "Idea sessions do not use correctness-based attempts."}
    if session["status"] == "completed":
        return {"error": "This session is already completed."}
    flow = session["academic_flow"]
    diagnosis = diagnose_academic_attempt(
        session["question"], answer, [item["text"] for item in flow["attempts"]], flow["hints"]
    )
    flow["attempts"].append({"text": answer, "diagnosis": diagnosis})
    is_correct = diagnosis["status"] == "correct"
    flow["stage"] = "completed" if is_correct else "revising"
    if is_correct:
        session["status"] = "completed"
    return {
        "correct": is_correct,
        "feedback": diagnosis["feedback"],
        "diagnosis": diagnosis,
        "stage": flow["stage"],
        "attempt_count": len(flow["attempts"]),
        "hint_available": not is_correct,
        "response_type": flow["response_type"],
        "session_completed": is_correct,
        "status": session["status"],
    }


def reveal_answer(session_id):
    """Reveal an Academic final answer after an attempt, if allowed."""
    if session_id not in store:
        return {"error": "Session not found."}
    session = store[session_id]
    if _session_mode(session) == "idea":
        return {"error": "Idea sessions generate concepts directly instead of revealing an answer."}
    flow = session["academic_flow"]
    if not flow["attempts"]:
        return {"error": "Submit an attempt before viewing the worked solution."}
    if not flow["worked_solution"]:
        flow["worked_solution"] = generate_worked_solution(session["question"], flow["response_type"])
    flow["stage"] = "solution_reviewed"
    solution = flow["worked_solution"]
    return {
        "answer": solution["final_answer"],
        "worked_solution": solution,
        "stage": flow["stage"],
        "mode": "academic",
    }
