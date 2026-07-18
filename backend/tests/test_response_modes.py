import io
import unittest
from unittest.mock import patch

from app import app
from services.session_service import (
    create_session,
    develop_selected_ideas,
    generate_idea_now,
    get_next_hint,
    get_session_state,
    submit_idea_answers,
    submit_attempt,
    reveal_answer,
)
from storage.memory_store import store


class UploadedImage(io.BytesIO):
    def __init__(self, data=b"fake-image-bytes", filename="idea.png", mimetype="image/png"):
        super().__init__(data)
        self.filename = filename
        self.mimetype = mimetype


def discovery_plan(context=None, ready=False):
    return {
        "summary": "You want to explore an AI project.",
        "task_profile": {"task_type": "product_project", "requested_deliverable": "an AI project", "generation_style": "product concepts"},
        "reason": "These choices will shape the shortlist.",
        "known_context": context or {},
        "missing_context": ["target user", "domain"],
        "ready_to_generate": ready,
        "assumptions": ["Missing preferences will remain flexible."],
        "questions": [
            {"id": "target_user", "question": "Who should this help?", "type": "single_select", "options": ["Students", "Other"], "allow_custom_answer": True},
            {"id": "domain", "question": "Which area interests you?", "type": "single_select", "options": ["Education", "Other"], "allow_custom_answer": True},
            {"id": "purpose", "question": "What is it for?", "type": "single_select", "options": ["School project", "Other"], "allow_custom_answer": True},
        ],
    }


def idea(name="FocusQuest"):
    return {
        "name": name, "concept": "An AI tool for manageable study tasks.",
        "why_it_fits": "It fits an education project.", "distinctive_angle": "It reduces overload instead of answering homework.",
        "details": [{"label": "User", "value": "Students"}, {"label": "Problem", "value": "Assignments feel overwhelming."}, {"label": "AI role", "value": "Personalises task plans."}],
        "difficulty": "medium", "next_step": "Sketch the task flow.", "risk_or_consideration": "Avoid excessive monitoring.",
    }


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

    def test_academic_mode_keeps_hint_generation_strategy(self):
        validation = {"valid": True, "message": "OK", "cleaned_question": "Factorise $x^2 + 5x + 6$", "is_multi_part": False}
        with patch("services.session_service.validate_academic_request", return_value=validation), \
             patch("services.session_service.infer_academic_response_type", return_value={"kind": "calculation", "label": "Your calculation", "placeholder": "Show your steps", "guidance": "Show the formula"}) as response_type, \
             patch("services.session_service.infer_required_concepts", return_value=["Quadratic equations", "Algebraic expressions"]):
            result = create_session("Factorise x^2 + 5x + 6", "text", None, False, "academic")
        self.assertEqual(result["mode"], "academic")
        self.assertEqual(result["question"], "Factorise $x^2 + 5x + 6$")
        self.assertEqual(result["response_type"]["kind"], "calculation")
        self.assertEqual(result["requiredConcepts"], ["Quadratic equations", "Algebraic expressions"])
        response_type.assert_called_once()

    def test_single_question_attempt_and_reveal_flow(self):
        validation = {"valid": True, "message": "OK", "cleaned_question": "Solve $x + 2 = 5$.", "is_multi_part": False}
        diagnosis = {"working_verdict": "right_way", "answer_verdict": "incorrect"}
        solution = {"full_working": "Subtract $2$ from both sides, giving $x = 3$.", "final_answer": "$x = 3$"}
        with patch("services.session_service.validate_academic_request", return_value=validation), \
             patch("services.session_service.infer_required_concepts", return_value=["Linear equations", "Algebra"]), \
             patch("services.session_service.diagnose_academic_attempt", return_value=diagnosis), \
             patch("services.session_service.generate_worked_solution", return_value=solution):
            created = create_session("Solve x + 2 = 5.", "text", None, False, "academic")
            attempted = submit_attempt(created["session_id"], "x = -3")
            revealed = reveal_answer(created["session_id"])
        self.assertEqual(attempted["working_verdict"], "right_way")
        self.assertEqual(attempted["answer_verdict"], "incorrect")
        self.assertFalse(attempted["correct"])
        self.assertNotIn("feedback", attempted)
        self.assertEqual(revealed["worked_solution"], solution)
        self.assertNotIn("current_sub_question_index", created)

    def test_correct_answer_completes_regardless_of_working_verdict(self):
        validation = {"valid": True, "message": "OK", "cleaned_question": "Solve $x + 2 = 5$.", "is_multi_part": False}
        with patch("services.session_service.validate_academic_request", return_value=validation), \
             patch("services.session_service.infer_required_concepts", return_value=["Linear equations", "Algebra"]), \
             patch("services.session_service.diagnose_academic_attempt") as diagnose:
            for working_verdict in ("right_way", "wrong_way"):
                with self.subTest(working_verdict=working_verdict):
                    diagnose.return_value = {"working_verdict": working_verdict, "answer_verdict": "correct"}
                    created = create_session("Solve x + 2 = 5.", "text", None, False, "academic")
                    attempted = submit_attempt(created["session_id"], "I guessed after adding 2. x = 3")
                    self.assertTrue(attempted["correct"])
                    self.assertTrue(attempted["session_completed"])
                    self.assertEqual(attempted["status"], "completed")

    def test_missing_answer_keeps_session_open(self):
        validation = {"valid": True, "message": "OK", "cleaned_question": "Solve $x + 2 = 5$.", "is_multi_part": False}
        diagnosis = {"working_verdict": "right_way", "answer_verdict": "not_provided"}
        with patch("services.session_service.validate_academic_request", return_value=validation), \
             patch("services.session_service.infer_required_concepts", return_value=["Linear equations", "Algebra"]), \
             patch("services.session_service.diagnose_academic_attempt", return_value=diagnosis):
            created = create_session("Solve x + 2 = 5.", "text", None, False, "academic")
            attempted = submit_attempt(created["session_id"], "Subtract 2 from both sides.")
        self.assertFalse(attempted["correct"])
        self.assertFalse(attempted["session_completed"])
        self.assertEqual(attempted["status"], "active")

    def test_health_requires_only_key_and_text_model(self):
        with patch("app.OPENROUTER_API_KEY", "key"), patch("app.AI_TEXT_MODEL", "vision-model"):
            response = self.client.get("/api/health")
        payload = response.get_json()
        self.assertTrue(payload["ai_configured"])
        self.assertNotIn("image_model", payload)

    def test_broad_idea_request_starts_discovery_without_hints(self):
        with patch("services.session_service.validate_input", return_value={"valid": True, "message": "OK"}), \
             patch("services.session_service.clean_idea_request", return_value="Help me make an AI-powered solution."), \
             patch("services.session_service.plan_idea_discovery", return_value=discovery_plan()) as planner:
            result = create_session("Help me make an AI-powered solution.", "text", None, False, "idea")
        self.assertEqual(result["idea_flow"]["stage"], "collecting_broad_context")
        self.assertEqual(len(result["idea_flow"]["questions"]), 3)
        self.assertTrue(result["idea_flow"]["can_generate_now"])
        self.assertNotIn("current_hint", result)
        planner.assert_called_once()

    def test_adaptive_answers_are_saved_and_produce_next_round(self):
        first = discovery_plan()
        second = discovery_plan({"target_user": ["Students"], "domain": ["Education"], "project_purpose": ["School project"]})
        with patch("services.session_service.validate_input", return_value={"valid": True, "message": "OK"}), \
             patch("services.session_service.clean_idea_request", return_value="AI project"), \
             patch("services.session_service.plan_idea_discovery", side_effect=[first, second]):
            session = create_session("AI project", "text", None, False, "idea")
            result = submit_idea_answers(session["session_id"], [
                {"question_id": "target_user", "selected_options": ["Students"], "custom_answer": ""},
                {"question_id": "domain", "selected_options": ["Education"], "custom_answer": ""},
                {"question_id": "purpose", "selected_options": ["School project"], "custom_answer": ""},
            ])
        self.assertEqual(result["idea_flow"]["round"], 2)
        self.assertEqual(store[session["session_id"]]["idea_flow"]["question_rounds"][0]["answers"][0]["selected_options"], ["Students"])

    def test_generate_now_returns_shortlist_and_development_brief(self):
        ideas = [idea(f"Idea {index}") for index in range(1, 6)]
        brief = {"title": "Idea 1 plan", "summary": "A focused first release.", "recommended_direction": "Build the smallest useful workflow.", "focus_areas": ["One", "Two", "Three"], "next_steps": ["Interview", "Sketch", "Build"], "review_step": "Test with three users.", "considerations": ["Scope"]}
        with patch("services.session_service.validate_input", return_value={"valid": True, "message": "OK"}), \
             patch("services.session_service.clean_idea_request", return_value="Just generate ideas"), \
             patch("services.session_service.plan_idea_discovery", return_value=discovery_plan()), \
             patch("services.session_service.generate_personalized_ideas", return_value=ideas), \
             patch("services.session_service.generate_idea_development_brief", return_value=brief):
            session = create_session("Just generate ideas", "text", None, False, "idea")
            generated = generate_idea_now(session["session_id"])
            developed = develop_selected_ideas(session["session_id"], ["idea_1"])
        self.assertEqual(generated["idea_flow"]["stage"], "ideas_generated")
        self.assertEqual(len(generated["idea_flow"]["ideas"]), 5)
        self.assertEqual(developed["idea_flow"]["development_brief"]["title"], "Idea 1 plan")

    def test_idea_generate_and_develop_routes_return_idea_state(self):
        ideas = [idea(f"Idea {index}") for index in range(1, 6)]
        brief = {"title": "Idea 1 plan", "summary": "A focused first release.", "recommended_direction": "Build the smallest useful workflow.", "focus_areas": ["One", "Two", "Three"], "next_steps": ["Interview", "Sketch", "Build"], "review_step": "Test with three users.", "considerations": []}
        with patch("services.session_service.validate_input", return_value={"valid": True, "message": "OK"}), \
             patch("services.session_service.clean_idea_request", return_value="AI project"), \
             patch("services.session_service.plan_idea_discovery", return_value=discovery_plan()), \
             patch("services.session_service.generate_personalized_ideas", return_value=ideas), \
             patch("services.session_service.generate_idea_development_brief", return_value=brief):
            session = create_session("AI project", "text", None, False, "idea")
            generated = self.client.post(f"/api/session/{session['session_id']}/idea/generate")
            developed = self.client.post(f"/api/session/{session['session_id']}/idea/develop", json={"idea_ids": ["idea_1"]})
        self.assertEqual(generated.status_code, 200)
        self.assertEqual(generated.get_json()["idea_flow"]["stage"], "ideas_generated")
        self.assertEqual(developed.status_code, 200)
        self.assertEqual(developed.get_json()["idea_flow"]["development_brief"]["title"], "Idea 1 plan")

    def test_idea_endpoints_reject_academic_hint_contract(self):
        store["idea"] = {"session_id": "idea", "mode": "idea", "status": "active", "cleaned_question": "AI project", "idea_flow": {"stage": "collecting_broad_context", "round": 1, "summary": "AI project", "reason": "", "task_profile": {"task_type": "general", "requested_deliverable": "project", "generation_style": "concepts"}, "known_context": {}, "missing_context": [], "question_rounds": [], "current_questions": [], "can_generate_now": True, "assumptions": [], "ideas": [], "selected_idea_ids": [], "development_brief": None}}
        self.assertIn("discovery questions", get_next_hint("idea")["error"])
        self.assertEqual(get_session_state("idea")["mode"], "idea")

    def test_idea_image_requests_use_existing_upload_pipeline(self):
        image = UploadedImage()
        with patch("services.session_service.extract_idea_context_from_image", return_value="a sketch of a city skyline"), \
             patch("services.session_service.validate_input", return_value={"valid": True, "message": "OK"}), \
             patch("services.session_service.clean_idea_request", side_effect=lambda text, **kwargs: text), \
             patch("services.session_service.plan_idea_discovery", return_value=discovery_plan()) as planner:
            create_session("poem idea", "image", image, False, "idea")
        self.assertIn("creative context", planner.call_args.args[0])
        self.assertIn("a sketch of a city skyline", planner.call_args.args[0])


if __name__ == "__main__":
    unittest.main()
