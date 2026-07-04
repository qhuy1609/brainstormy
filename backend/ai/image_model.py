import base64
import logging
import os
from typing import Any

from ai.openrouter import (
    AIConfigError,
    AIEmptyResponseError,
    AIRateLimitError,
    AIServiceError,
    AIUnsupportedImageError,
    call_openrouter,
    require_env,
)

IMAGE_MODEL_ENV = "AI_IMAGE_MODEL"
MAX_IMAGE_BYTES = 8 * 1024 * 1024
SUPPORTED_IMAGE_MIMES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

IMAGE_EXTRACTION_PROMPT = """You are an image-to-question extraction engine.

Read the uploaded image carefully. Extract all useful information needed to solve or answer the question.

Return a structured result with:
- Full question text
- Any answer choices
- Any numbers, equations, labels, diagrams, or table data
- Any visible handwritten working
- Any ambiguity or unreadable parts

Do not solve the question unless necessary for interpreting the image.
Be accurate and do not invent missing information."""

logger = logging.getLogger(__name__)


class ImageInputError(AIServiceError):
    """Raised when an uploaded image cannot be accepted."""


def get_image_model() -> str:
    return require_env(IMAGE_MODEL_ENV)


def _validate_image_file(image_file: Any) -> str:
    filename = getattr(image_file, "filename", "") or ""
    extension = os.path.splitext(filename.lower())[1]
    mime_type = (getattr(image_file, "mimetype", "") or "").lower()

    if extension not in SUPPORTED_IMAGE_EXTENSIONS or mime_type not in SUPPORTED_IMAGE_MIMES:
        raise ImageInputError("Please upload a jpg, jpeg, png, or webp image.")

    return mime_type


def extract_question_from_image(image_file: Any) -> str:
    """Use the configured OpenRouter vision model to extract structured question text."""
    mime_type = _validate_image_file(image_file)
    image_bytes = image_file.read()
    image_file.seek(0)

    if not image_bytes:
        raise ImageInputError("The uploaded image is empty.")

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ImageInputError("The uploaded image is too large. Please use an image under 8 MB.")

    data_url = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('utf-8')}"
    model = get_image_model()
    logger.info("Calling OpenRouter image model: %s", model)

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": IMAGE_EXTRACTION_PROMPT},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }
    ]

    try:
        extracted = call_openrouter(model=model, messages=messages, temperature=0)
    except AIConfigError:
        raise
    except AIRateLimitError as exc:
        raise AIRateLimitError("The image model is currently rate-limited. Try another AI_IMAGE_MODEL.") from exc
    except AIUnsupportedImageError as exc:
        raise AIUnsupportedImageError(
            "The selected image model does not support this uploaded image. Try another AI_IMAGE_MODEL."
        ) from exc
    except AIEmptyResponseError as exc:
        raise AIEmptyResponseError("The uploaded image could not be read clearly.") from exc
    except AIServiceError as exc:
        raise AIServiceError("The image model is currently unavailable. Try again or switch AI_IMAGE_MODEL.") from exc

    logger.info("Image extraction succeeded.")
    return extracted.strip()
