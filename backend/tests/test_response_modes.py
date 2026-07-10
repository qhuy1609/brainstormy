import io
import unittest
from unittest.mock import patch

from ai.openrouter import AIServiceError
from app import app
from services.ai_service import generate_idea_hints
from services.session_service import (
    create_session,
    get_next_hint,
    get_session_state,
    reveal_answer,
)
from storage.memory_store import store


class UploadedImage(io.BytesIO):
    def __init__(self, data=b"fake-image-bytes", filename="idea.png", mimetype="image/png"):
        super().__init__(data)
        self.filename = filename
        self.mimetype = mimetype


class ResponseModeTests(unittest.TestCase):
    def setUp(self):
        store.clear()
        app.config["TESTING"] = True
        self.client = app.test_client()

    def test_missing_mode_defaults_to_academic(self):
        with patch("routes.learning_routes.create_session", return_value={"session_id": "abc", "mode": "academic"}) as create:
            response = self.client.post("/api/session/start", data={"question": "Factorise x^2 + 5x + 6"})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(create.call_args.args[4], "academic")

    def test_unknown_mode_is_rejected(self):
        with patch("routes.learning_routes.create_session") as create:
            response = self.client.post(
                "/api/session/start",
                data={"question": "Factorise x^2 + 5x + 6", "mode": "model-name"},
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid mode", response.get_json()["error"])
        create.assert_not_called()

    def test_empty_idea_request_uses_existing_empty_input_validation(self):
        response = self.client.post("/api/session/start", data={"mode": "idea"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Please provide a question or upload an image.")

    def test_academic_mode_uses_existing_academic_generation_strategy(self):
        with patch("services.session_service.validate_input", return_value={"valid": True, "message": "OK"}), \
             patch("services.session_service.clean_question", return_value="Factorise x^2 + 5x + 6"), \
             patch("services.session_service.decompose_question", return_value=["Factorise x^2 + 5x + 6"]), \
             patch("services.session_service.generate_hints", return_value=["h1", "h2", "h3"]) as academic_hints, \
             patch("services.session_service.generate_idea_hints") as idea_hints, \
             patch("services.session_service.generate_final_answer", return_value="(x+2)(x+3)"):
            result = create_session("Factorise x^2 + 5x + 6", "text", None, False, "academic")

        self.assertEqual(result["mode"], "academic")
        academic_hints.assert_called_once_with("Factorise x^2 + 5x + 6")
        idea_hints.assert_not_called()

    def test_idea_mode_uses_idea_generation_strategy_and_stores_three_hints(self):
        with patch("services.session_service.validate_input", return_value={"valid": True, "message": "OK"}), \
             patch("services.session_service.clean_idea_request", return_value="Write a lonely city poem"), \
             patch("services.session_service.generate_idea_hints", return_value=["direction", "blocks", "scaffold"]) as idea_hints, \
             patch("services.session_service.generate_idea_final_guidance", return_value="final guidance"):
            result = create_session("Write a lonely city poem", "text", None, True, "idea")

        session = store[result["session_id"]]
        self.assertEqual(result["mode"], "idea")
        self.assertEqual(session["mode"], "idea")
        self.assertEqual(session["exam_mode"], True)
        self.assertEqual(session["sub_questions"][0]["hints"], ["direction", "blocks", "scaffold"])
        self.assertEqual(result["current_hint_title"], "Direction")
        idea_hints.assert_called_once_with("Write a lonely city poem")

    def test_idea_clarification_result_does_not_generate_hints(self):
        validation = {
            "status": "needs_clarification",
            "valid": False,
            "message": "Please add a little more detail about what you want to create.",
            "clarification_question": "What would you like to create about \"city boyyy\"?",
            "request_type": "unknown",
        }

        with patch("services.session_service.validate_input", return_value=validation), \
             patch("services.session_service.clean_idea_request") as clean, \
             patch("services.session_service.generate_idea_hints") as hints, \
             patch("services.session_service.generate_idea_final_guidance") as guidance:
            result = create_session("city boyyy", "text", None, False, "idea")

        self.assertEqual(result["status"], "needs_clarification")
        self.assertEqual(result["clarification_question"], validation["clarification_question"])
        clean.assert_not_called()
        hints.assert_not_called()
        guidance.assert_not_called()

    def test_idea_hint_progression_is_ordered(self):
        with patch("services.session_service.validate_input", return_value={"valid": True, "message": "OK"}), \
             patch("services.session_service.clean_idea_request", return_value="Campaign for teen recycling"), \
             patch("services.session_service.generate_idea_hints", return_value=["direction", "blocks", "scaffold"]), \
             patch("services.session_service.generate_idea_final_guidance", return_value="final guidance"):
            result = create_session("Campaign for teen recycling", "text", None, False, "idea")

        second = get_next_hint(result["session_id"])
        third = get_next_hint(result["session_id"])

        self.assertEqual(result["current_hint_level"], 0)
        self.assertEqual(second["hint_level"], 1)
        self.assertEqual(third["hint_level"], 2)
        self.assertEqual([result["current_hint_title"], second["hint_title"], third["hint_title"]], [
            "Direction",
            "Building blocks",
            "Actionable scaffold",
        ])

    def test_idea_image_requests_reuse_existing_upload_pipeline(self):
        image = UploadedImage()
        with patch("services.session_service.extract_text_from_image", return_value="a sketch of a city skyline") as extract, \
             patch("services.session_service.validate_input", return_value={"valid": True, "message": "OK"}), \
             patch("services.session_service.clean_idea_request", side_effect=lambda text, **kwargs: text), \
             patch("services.session_service.generate_idea_hints", return_value=["direction", "blocks", "scaffold"]) as hints, \
             patch("services.session_service.generate_idea_final_guidance", return_value="final guidance"):
            create_session("poem idea", "image", image, False, "idea")

        extract.assert_called_once_with(image)
        self.assertIn("creative context", hints.call_args.args[0])
        self.assertIn("a sketch of a city skyline", hints.call_args.args[0])
        self.assertIn("poem idea", hints.call_args.args[0])

    def test_idea_exam_mode_keeps_reveal_disabled(self):
        with patch("services.session_service.validate_input", return_value={"valid": True, "message": "OK"}), \
             patch("services.session_service.clean_idea_request", return_value="Write a lonely city poem"), \
             patch("services.session_service.generate_idea_hints", return_value=["direction", "blocks", "scaffold"]), \
             patch("services.session_service.generate_idea_final_guidance", return_value="do not write the full poem"):
            result = create_session("Write a lonely city poem", "text", None, True, "idea")

        self.assertEqual(reveal_answer(result["session_id"])["error"], "Answer reveal is disabled in exam mode.")

    def test_legacy_sessions_without_mode_open_as_academic(self):
        store["legacy"] = {
            "cleaned_question": "Factorise x^2 + 5x + 6",
            "sub_questions": [{
                "question": "Factorise x^2 + 5x + 6",
                "hints": ["h1", "h2", "h3"],
                "current_hint_level": 0,
                "completed": False,
                "attempts": [],
                "final_answer": "(x+2)(x+3)",
            }],
            "current_sub_question_index": 0,
            "status": "active",
        }

        result = get_session_state("legacy")

        self.assertEqual(result["mode"], "academic")
        self.assertEqual(result["current_hint_title"], "Hint 1")

    def test_malformed_idea_hint_output_is_rejected(self):
        with patch("services.ai_service._call_ai", return_value={"hints": ["one", "two"]}):
            with self.assertRaises(AIServiceError):
                generate_idea_hints("Write a poem idea")


if __name__ == "__main__":
    unittest.main()
