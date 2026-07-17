import logging
import os
from typing import Any

import requests

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
REQUEST_TIMEOUT_SECONDS = 60

logger = logging.getLogger(__name__)


class AIServiceError(RuntimeError):
    """Raised when an AI service cannot return a usable response."""


class AIConfigError(AIServiceError):
    """Raised when required AI configuration is missing."""


class AIRateLimitError(AIServiceError):
    """Raised when OpenRouter reports rate limiting."""


class AIUnsupportedImageError(AIServiceError):
    """Raised when a model rejects image input."""


class AIEmptyResponseError(AIServiceError):
    """Raised when OpenRouter returns no assistant content."""


class AIStructuredResponseError(AIServiceError):
    """Raised when a model response cannot satisfy a required structured schema."""


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise AIConfigError(f"{name} is missing. Add it to backend/.env and restart the backend.")
    return value


def _response_text(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(str(item.get("text", "")))
        return "\n".join(part.strip() for part in parts if part.strip()).strip()

    return str(content or "").strip()


def _looks_like_unsupported_image_error(status_code: int, body: str) -> bool:
    lowered = body.lower()
    return (
        status_code in {400, 422}
        and "image" in lowered
        and any(marker in lowered for marker in ("unsupported", "not support", "invalid", "multimodal"))
    )


def call_openrouter(
    *,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float = 0.2,
    max_tokens: int | None = None,
    json_mode: bool = False,
) -> str:
    """Call OpenRouter with the model and messages supplied by the caller."""
    if not model:
        raise AIConfigError("An OpenRouter model name is missing.")

    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }

    if max_tokens is not None:
        payload["max_tokens"] = max_tokens

    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    try:
        response = requests.post(
            OPENROUTER_API_URL,
            headers={
                "Authorization": f"Bearer {require_env('OPENROUTER_API_KEY')}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        logger.warning("OpenRouter request failed before receiving a response: %s", exc)
        raise AIServiceError("OpenRouter is currently unavailable. Try again shortly.") from exc

    if response.status_code == 429:
        raise AIRateLimitError("OpenRouter rate limit reached.")

    if response.status_code >= 400:
        body = response.text[:1000]
        logger.warning("OpenRouter returned HTTP %s.", response.status_code)
        if _looks_like_unsupported_image_error(response.status_code, body):
            raise AIUnsupportedImageError("OpenRouter rejected the image input.")
        raise AIServiceError(f"OpenRouter request failed with status {response.status_code}.")

    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise AIServiceError("OpenRouter response did not contain message content.") from exc

    text = _response_text(content)
    if not text:
        raise AIEmptyResponseError("OpenRouter returned an empty response.")

    return text
