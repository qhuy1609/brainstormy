import logging
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

TEXT_MODEL_ENV = "AI_TEXT_MODEL"

logger = logging.getLogger(__name__)


def get_text_model() -> str:
    return require_env(TEXT_MODEL_ENV)


def call_text_model(
    messages: list[dict[str, Any]],
    *,
    temperature: float = 0.2,
    max_tokens: int | None = None,
    json_mode: bool = False,
) -> str:
    model = get_text_model()
    logger.info("Calling OpenRouter text model: %s", model)

    try:
        return call_openrouter(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=json_mode,
        )
    except AIConfigError:
        raise
    except AIRateLimitError as exc:
        raise AIRateLimitError("The text model is currently rate-limited. Try another AI_TEXT_MODEL.") from exc
    except AIEmptyResponseError as exc:
        raise AIEmptyResponseError("The text model returned an empty response. Try another AI_TEXT_MODEL.") from exc
    except AIUnsupportedImageError as exc:
        raise AIUnsupportedImageError(
            "The selected AI_TEXT_MODEL does not support this uploaded image. Choose a vision-capable model."
        ) from exc
    except AIServiceError as exc:
        raise AIServiceError("The text model is currently unavailable. Try again or switch AI_TEXT_MODEL.") from exc
