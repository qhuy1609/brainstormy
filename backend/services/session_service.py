import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from services.ai_service import (
    validate_input,
    extract_text_from_image,
    clean_question,
    clean_idea_request,
    detect_idea_language,
    decompose_question,
    generate_hints,
    generate_final_answer,
    check_attempt,
    generate_explanation,
    infer_academic_response_type,
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
    if input_type == "image" and image_file:
        logger.info("Starting image input route for mode=%s.", mode)
        extracted_image_text = extract_text_from_image(image_file)
        raw_text = _build_image_augmented_input(raw_input, extracted_image_text, mode)
        logger.info("Image route extraction succeeded; continuing with text model pipeline.")
    else:
        logger.info("Starting text-only input route for mode=%s.", mode)
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

    # Academic Mode deliberately keeps its existing single-session contract.
    cleaned = clean_question(raw_text, force_llm_cleanup=input_type == "image")
    sub_questions_raw = decompose_question(cleaned)
    sub_questions = []
    for sq_text in sub_questions_raw:
        response_type = infer_academic_response_type(sq_text)
        sub_questions.append({
            "question": sq_text,
            "academic_flow": {"stage": "initial_attempt", "response_type": response_type, "attempts": [], "hints": [], "worked_solution": None},
            "attempts": [],
            "completed": False,
        })

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
        "response_type": first_sq["academic_flow"]["response_type"],
        "stage": "initial_attempt",
        "attempt_count": 0,
        "hint_available": True,
        "status": "active",
    }


def get_session_state(session_id):
    """Return the current state of a session."""
    if session_id not in store:
        return {"error": "Session not found."}
    session = store[session_id]
    if _session_mode(session) == "idea":
        return _idea_flow_response(session)
    idx = session["current_sub_question_index"]
    sq = session["sub_questions"][idx]
    flow = sq.get("academic_flow")
    if flow:
        return {"session_id": session_id, "mode": "academic", "cleaned_question": session["cleaned_question"], "is_multi_part": len(session["sub_questions"]) > 1, "total_sub_questions": len(session["sub_questions"]), "current_sub_question_index": idx, "current_sub_question": sq["question"], "status": session["status"], "stage": flow["stage"], "response_type": flow["response_type"], "attempt_count": len(flow["attempts"]), "hint_available": True, "current_hint": flow["hints"][-1] if flow["hints"] else None, "worked_solution": flow["worked_solution"]}
    return {
        "session_id": session_id,
        "mode": "academic",
        "cleaned_question": session["cleaned_question"],
        "is_multi_part": len(session["sub_questions"]) > 1,
        "total_sub_questions": len(session["sub_questions"]),
        "current_sub_question_index": idx,
        "current_sub_question": sq["question"],
        "current_hint_level": sq["current_hint_level"],
        "current_hint_title": f"Hint {sq['current_hint_level'] + 1}",
        "current_hint": sq["hints"][sq["current_hint_level"]] if sq["hints"] else "No more hints.",
        "status": session["status"],
    }


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
    """Advance to the next Academic hint level."""
    if session_id not in store:
        return {"error": "Session not found."}
    session = store[session_id]
    if _session_mode(session) == "idea":
        return {"error": "Idea sessions use discovery questions instead of hints."}
    if session["status"] == "completed":
        return {"error": "This session is already completed."}
    sq = session["sub_questions"][session["current_sub_question_index"]]
    if "academic_flow" in sq:
        flow = sq["academic_flow"]
        if not flow["attempts"]:
            hint = generate_initial_academic_hint(sq["question"], flow["response_type"])
        else:
            latest = flow["attempts"][-1]
            hint = generate_targeted_academic_hint(sq["question"], latest["text"], latest["diagnosis"], flow["hints"])
        flow["hints"].append(hint)
        flow["stage"] = "feedback_received" if flow["attempts"] else "initial_attempt"
        return {"hint": hint, "current_hint": hint, "stage": flow["stage"], "hint_count": len(flow["hints"])}
    if sq["completed"]:
        return {"error": "This sub-question is already completed."}
    if sq["current_hint_level"] >= 2:
        return {"hint_level": sq["current_hint_level"], "hint_title": "Hint 3", "hint": "No more hints available. Please attempt an answer.", "max_hints_reached": True}
    sq["current_hint_level"] += 1
    level = sq["current_hint_level"]
    return {"hint_level": level, "hint_title": f"Hint {level + 1}", "hint": sq["hints"][level], "max_hints_reached": level >= 2}


def submit_attempt(session_id, answer):
    """Check an Academic answer for the current sub-question."""
    if session_id not in store:
        return {"error": "Session not found."}
    session = store[session_id]
    if _session_mode(session) == "idea":
        return {"error": "Idea sessions do not use correctness-based attempts."}
    if session["status"] == "completed":
        return {"error": "This session is already completed."}
    idx = session["current_sub_question_index"]
    sq = session["sub_questions"][idx]
    if "academic_flow" in sq:
        flow = sq["academic_flow"]
        diagnosis = diagnose_academic_attempt(sq["question"], answer, [item["text"] for item in flow["attempts"]], flow["hints"])
        flow["attempts"].append({"text": answer, "diagnosis": diagnosis})
        flow["stage"] = "completed" if diagnosis["status"] == "correct" else "revising"
        sq["attempts"].append(answer)
        if diagnosis["status"] == "correct":
            sq["completed"] = True
            if idx + 1 < len(session["sub_questions"]):
                session["current_sub_question_index"] = idx + 1
            else:
                session["status"] = "completed"
        feedback_text = " ".join(part for part in (diagnosis.get("strength"), diagnosis.get("focus"), diagnosis.get("next_action")) if part)
        return {"correct": diagnosis["status"] == "correct", "feedback": feedback_text, "diagnosis": diagnosis, "stage": flow["stage"], "attempt_count": len(flow["attempts"]), "hint_available": diagnosis["targeted_hint_available"], "response_type": flow["response_type"], "session_completed": session["status"] == "completed", "status": session["status"]}
    if sq["completed"]:
        return {"error": "This sub-question is already completed."}
    sq["attempts"].append(answer)
    result = check_attempt(sq["question"], answer, sq["final_answer"])
    if result["correct"]:
        sq["completed"] = True
        explanation = generate_explanation(sq["question"], sq["final_answer"])
        if idx + 1 < len(session["sub_questions"]):
            next_idx = idx + 1
            session["current_sub_question_index"] = next_idx
            next_sq = session["sub_questions"][next_idx]
            return {"correct": True, "feedback": result["feedback"], "explanation": explanation, "sub_question_completed": True, "session_completed": False, "next_sub_question_index": next_idx, "next_sub_question": next_sq["question"], "next_hint_level": 0, "next_hint_title": "Hint 1", "next_hint": next_sq["hints"][0], "status": "active"}
        session["status"] = "completed"
        return {"correct": True, "feedback": result["feedback"], "explanation": explanation, "sub_question_completed": True, "session_completed": True, "status": "completed"}
    return {"correct": False, "feedback": result["feedback"], "sub_question_completed": False, "session_completed": False, "current_hint_level": sq["current_hint_level"], "hints_remaining": 2 - sq["current_hint_level"], "status": "active"}


def reveal_answer(session_id):
    """Reveal an Academic final answer after an attempt, if allowed."""
    if session_id not in store:
        return {"error": "Session not found."}
    session = store[session_id]
    if _session_mode(session) == "idea":
        return {"error": "Idea sessions generate concepts directly instead of revealing an answer."}
    idx = session["current_sub_question_index"]
    sq = session["sub_questions"][idx]
    if "academic_flow" in sq:
        flow = sq["academic_flow"]
        if not flow["attempts"]:
            return {"error": "Submit an attempt before viewing the worked solution."}
        if not flow["worked_solution"]:
            flow["worked_solution"] = generate_worked_solution(sq["question"], flow["response_type"])
        flow["stage"] = "solution_reviewed"
        latest = flow["attempts"][-1]["text"]
        solution = flow["worked_solution"]
        if not solution.get("comparison_to_attempt"):
            solution["comparison_to_attempt"] = "Compare the key steps here with your latest response."
        return {"answer": solution["final_answer"], "worked_solution": solution, "stage": flow["stage"], "mode": "academic"}
    if session["exam_mode"]:
        return {"error": "Answer reveal is disabled in exam mode."}
    if len(sq["attempts"]) == 0:
        return {"error": "You must attempt the question at least once before revealing the answer."}
    return {"answer": sq["final_answer"], "mode": "academic", "sub_question_index": idx, "sub_question": sq["question"]}
