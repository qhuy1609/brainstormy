import io
import os
import unittest
from unittest.mock import patch

from ai import text_model
from ai.image_input import ImageInputError, image_file_to_content
from ai.openrouter import AIConfigError, AIUnsupportedImageError


class UploadedImage(io.BytesIO):
    def __init__(self, data, filename="question.png", mimetype="image/png"):
        super().__init__(data)
        self.filename = filename
        self.mimetype = mimetype


class AIRoutingTests(unittest.TestCase):
    def test_text_model_uses_ai_text_model_for_multimodal_messages(self):
        messages = [{"role": "user", "content": [
            {"type": "text", "text": "Read this"},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64,ZmFrZQ=="}},
        ]}]
        with patch.dict(os.environ, {"AI_TEXT_MODEL": "vision-text-model"}, clear=False):
            with patch("ai.text_model.call_openrouter", return_value="ok") as call:
                self.assertEqual(text_model.call_text_model(messages), "ok")
        self.assertEqual(call.call_args.kwargs["model"], "vision-text-model")
        self.assertEqual(call.call_args.kwargs["messages"], messages)

    def test_image_helper_builds_data_url_and_rewinds_file(self):
        image = UploadedImage(b"fake-image-bytes")
        content = image_file_to_content(image)
        self.assertEqual(content["type"], "image_url")
        self.assertTrue(content["image_url"]["url"].startswith("data:image/png;base64,"))
        self.assertEqual(image.tell(), 0)

    def test_image_helper_rejects_unsupported_type(self):
        with self.assertRaises(ImageInputError):
            image_file_to_content(UploadedImage(b"data", filename="question.gif", mimetype="image/gif"))

    def test_image_helper_rejects_empty_and_oversized_files(self):
        with self.assertRaises(ImageInputError):
            image_file_to_content(UploadedImage(b""))
        with self.assertRaises(ImageInputError):
            image_file_to_content(UploadedImage(b"x" * (8 * 1024 * 1024 + 1)))

    def test_unsupported_image_error_is_preserved(self):
        with patch.dict(os.environ, {"AI_TEXT_MODEL": "text-only"}, clear=False), \
             patch("ai.text_model.call_openrouter", side_effect=AIUnsupportedImageError("unsupported")):
            with self.assertRaises(AIUnsupportedImageError) as raised:
                text_model.call_text_model([{"role": "user", "content": []}])
        self.assertIn("vision-capable", str(raised.exception))

    def test_missing_text_model_returns_config_error(self):
        with patch.dict(os.environ, {"AI_TEXT_MODEL": ""}, clear=False):
            with self.assertRaises(AIConfigError):
                text_model.get_text_model()


if __name__ == "__main__":
    unittest.main()
