import io
import os
import unittest
from unittest.mock import patch

from ai.openrouter import AIConfigError
from ai import image_model, text_model
from services.session_service import _build_image_augmented_input


class UploadedImage(io.BytesIO):
    def __init__(self, data, filename="question.png", mimetype="image/png"):
        super().__init__(data)
        self.filename = filename
        self.mimetype = mimetype


class AIRoutingTests(unittest.TestCase):
    def test_text_model_uses_ai_text_model(self):
        with patch.dict(os.environ, {"AI_TEXT_MODEL": "text-model"}, clear=False):
            with patch("ai.text_model.call_openrouter", return_value="ok") as call:
                self.assertEqual(text_model.call_text_model([{"role": "user", "content": "Hi"}]), "ok")

        self.assertEqual(call.call_args.kwargs["model"], "text-model")

    def test_image_model_uses_ai_image_model_first(self):
        image = UploadedImage(b"fake-image-bytes")

        with patch.dict(os.environ, {"AI_IMAGE_MODEL": "image-model"}, clear=False):
            with patch("ai.image_model.call_openrouter", return_value="extracted text") as call:
                self.assertEqual(image_model.extract_question_from_image(image), "extracted text")

        kwargs = call.call_args.kwargs
        self.assertEqual(kwargs["model"], "image-model")
        content = kwargs["messages"][0]["content"]
        self.assertEqual(content[1]["type"], "image_url")
        self.assertTrue(content[1]["image_url"]["url"].startswith("data:image/png;base64,"))

    def test_text_and_image_content_are_combined(self):
        combined = _build_image_augmented_input("typed context", "image extracted question")

        self.assertIn("image extracted question", combined)
        self.assertIn("typed context", combined)

    def test_missing_text_model_returns_config_error(self):
        with patch.dict(os.environ, {"AI_TEXT_MODEL": ""}, clear=False):
            with self.assertRaises(AIConfigError):
                text_model.get_text_model()


if __name__ == "__main__":
    unittest.main()
