import json
import re
from typing import Any

from ai.image_model import extract_question_from_image
from ai.openrouter import AIServiceError
from ai.text_model import call_text_model


def _extract_json(text: str) -> Any:
    """Parse a JSON response, allowing for accidental code fences or surrounding text."""
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", cleaned, flags=re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise


def _clean_display_text(text: Any) -> str:
    """Remove avoidable AI formatting that looks messy if shown directly."""
    cleaned = str(text or "").strip()
    cleaned = cleaned.replace(r"\$", "$")
    cleaned = re.sub(r"\\\((.*?)\\\)", r"$\1$", cleaned, flags=re.DOTALL)
    cleaned = re.sub(r"\\\[(.*?)\\\]", r"$$\1$$", cleaned, flags=re.DOTALL)
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"__(.*?)__", r"\1", cleaned)
    cleaned = re.sub(r"(?m)^\s*#{1,6}\s+", "", cleaned)
    return cleaned.strip()


def _call_ai(messages: list[dict[str, Any]], temperature: float = 0.2, json_mode: bool = False) -> Any:
    """Call the configured OpenRouter text model."""
    content = call_text_model(messages, temperature=temperature, json_mode=json_mode)
    if json_mode:
        try:
            return _extract_json(content)
        except json.JSONDecodeError as exc:
            raise AIServiceError("The text model returned an invalid structured response. Try again.") from exc

    return content.strip()


def _system_prompt() -> str:
    return (
        "You are the AI engine for BrainGuard, an academic tutor app. "
        "Help students think instead of instantly replacing their thinking. "
        "Be accurate, concise, and suitable for school/university homework."
    )


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_input(input_text):
    """Validate that the input is an academic question."""
    if not input_text or len(input_text.strip()) < 3:
        return {"valid": False, "message": "Input is too short or empty."}

    result = _call_ai(
        [
            {"role": "system", "content": _system_prompt()},
            {
                "role": "user",
                "content": (
                    "Decide whether this is a legitimate academic/study question. "
                    "Return JSON only in this shape: "
                    "{\"valid\": true/false, \"message\": \"short user-facing reason\"}.\n\n"
                    f"Input: {input_text}"
                ),
            },
        ],
        json_mode=True,
    )

    return {
        "valid": bool(result.get("valid")),
        "message": str(result.get("message") or "OK"),
    }


# ---------------------------------------------------------------------------
# Image text extraction
# ---------------------------------------------------------------------------

def extract_text_from_image(image_file):
    """Extract structured text from an uploaded image using the image model."""
    text = extract_question_from_image(image_file)
    return _clean_display_text(text)


# ---------------------------------------------------------------------------
# Clean question
# ---------------------------------------------------------------------------

def clean_question(raw_text):
    """Normalize the question text without changing its meaning."""
    if not raw_text or not raw_text.strip():
        return ""

    text = _call_ai(
        [
            {"role": "system", "content": _system_prompt()},
            {
                "role": "user",
                "content": (
                    "Clean this student question. Fix obvious OCR/spacing issues, preserve all math, "
                    "and do not solve it. Return only the cleaned question text. "
                    "Do not use Markdown bold, headings, or bullet points. "
                    "Use inline LaTeX math with single dollar signs when needed.\n\n"
                    f"Question: {raw_text}"
                ),
            },
        ],
        temperature=0,
    )
    return _clean_display_text(text)


# ---------------------------------------------------------------------------
# Decompose question into sub-questions
# ---------------------------------------------------------------------------

def decompose_question(cleaned_question):
    """Split a multi-part question into ordered sub-questions."""
    result = _call_ai(
        [
            {"role": "system", "content": _system_prompt()},
            {
                "role": "user",
                "content": (
                    "Split this question into ordered sub-questions only when it truly has multiple parts. "
                    "Return JSON only in this shape: {\"sub_questions\": [\"...\"]}. "
                    "Keep each sub-question clear and self-contained.\n\n"
                    f"Question: {cleaned_question}"
                ),
            },
        ],
        temperature=0,
        json_mode=True,
    )

    sub_questions = result.get("sub_questions")
    if not isinstance(sub_questions, list):
        return [cleaned_question]

    cleaned_parts = [str(part).strip() for part in sub_questions if str(part).strip()]
    return cleaned_parts or [cleaned_question]


# ---------------------------------------------------------------------------
# Generate 3 hint levels for a question
# ---------------------------------------------------------------------------

def generate_hints(question):
    """Return exactly 3 hints: conceptual, structural, near-answer."""
    result = _call_ai(
        [
            {"role": "system", "content": _system_prompt()},
            {
                "role": "user",
                "content": (
                    "Create exactly three hints for this question. "
                    "Hint 1 should be conceptual, Hint 2 should guide the method, "
                    "and Hint 3 should be close to the answer without fully revealing it. "
                    "Return JSON only in this shape: {\"hints\": [\"...\", \"...\", \"...\"]}. "
                    "Do not use Markdown bold, headings, or bullet points inside the strings. "
                    "Use inline LaTeX math with single dollar signs when needed.\n\n"
                    f"Question: {question}"
                ),
            },
        ],
        json_mode=True,
    )

    hints = result.get("hints")
    if not isinstance(hints, list) or len(hints) < 3:
        raise AIServiceError("AI did not return three hints.")

    return [_clean_display_text(hint) for hint in hints[:3]]


# ---------------------------------------------------------------------------
# Generate final answer
# ---------------------------------------------------------------------------

def generate_final_answer(question):
    """Generate the correct final answer for a question."""
    text = _call_ai(
        [
            {"role": "system", "content": _system_prompt()},
            {
                "role": "user",
                "content": (
                    "Solve this question accurately. Return only the final answer, not the full working. "
                    "Do not use Markdown bold or bullet points. Use inline LaTeX math with single dollar signs if needed.\n\n"
                    f"Question: {question}"
                ),
            },
        ],
        temperature=0,
    )
    return _clean_display_text(text)


# ---------------------------------------------------------------------------
# Check student attempt
# ---------------------------------------------------------------------------

def check_attempt(question, student_answer, correct_answer):
    """Check if the student's answer is correct."""
    if not student_answer or not student_answer.strip():
        return {"correct": False, "feedback": "Please provide an answer before submitting."}

    result = _call_ai(
        [
            {"role": "system", "content": _system_prompt()},
            {
                "role": "user",
                "content": (
                    "Evaluate the student's answer against the correct answer. "
                    "Accept mathematically equivalent answers. Return JSON only in this shape: "
                    "{\"correct\": true/false, \"feedback\": \"short helpful feedback\"}. "
                    "Do not use Markdown bold, headings, or bullet points in the feedback. "
                    "Use inline LaTeX math with single dollar signs when needed.\n\n"
                    f"Question: {question}\n"
                    f"Correct answer: {correct_answer}\n"
                    f"Student answer: {student_answer}"
                ),
            },
        ],
        temperature=0,
        json_mode=True,
    )

    return {
        "correct": bool(result.get("correct")),
        "feedback": _clean_display_text(result.get("feedback") or "Review your working and try again."),
    }


# ---------------------------------------------------------------------------
# Generate explanation (used when answer is correct)
# ---------------------------------------------------------------------------

def generate_explanation(question, correct_answer):
    """Generate a short explanation for the correct answer."""
    text = _call_ai(
        [
            {"role": "system", "content": _system_prompt()},
            {
                "role": "user",
                "content": (
                    "Write a short explanation of why this answer is correct. "
                    "Keep it student-friendly and concise. "
                    "Do not use Markdown bold, headings, or bullet points. "
                    "Use inline LaTeX math with single dollar signs when needed.\n\n"
                    f"Question: {question}\n"
                    f"Correct answer: {correct_answer}"
                ),
            },
        ],
        temperature=0.2,
    )
    return _clean_display_text(text)
