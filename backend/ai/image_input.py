import base64
import os
from typing import Any

from ai.openrouter import AIServiceError

MAX_IMAGE_BYTES = 8 * 1024 * 1024
SUPPORTED_IMAGE_MIMES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class ImageInputError(AIServiceError):
    """Raised when an uploaded image cannot be accepted."""


def image_file_to_content(image_file: Any) -> dict[str, Any]:
    """Validate an uploaded image and return an OpenRouter image content block."""
    filename = getattr(image_file, "filename", "") or ""
    extension = os.path.splitext(filename.lower())[1]
    mime_type = (getattr(image_file, "mimetype", "") or "").lower()

    if extension not in SUPPORTED_IMAGE_EXTENSIONS or mime_type not in SUPPORTED_IMAGE_MIMES:
        raise ImageInputError("Please upload a jpg, jpeg, png, or webp image.")

    image_bytes = image_file.read()
    image_file.seek(0)
    if not image_bytes:
        raise ImageInputError("The uploaded image is empty.")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ImageInputError("The uploaded image is too large. Please use an image under 8 MB.")

    data_url = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('utf-8')}"
    return {"type": "image_url", "image_url": {"url": data_url}}
