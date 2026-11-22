import unittest

from fastapi.testclient import TestClient

from api.main import app


class PredictionApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()

    def tearDown(self) -> None:
        self.client_context.__exit__(None, None, None)

    def test_health_reports_ready_after_loading_artifacts(self) -> None:
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ready"})

    def test_predict_uses_eight_features_and_returns_class_one_probability(self) -> None:
        response = self.client.post(
            "/api/predict",
            json={
                "glucose": 120,
                "bmi": 28.5,
                "cholesterol": 200,
                "insulin": 80,
                "bloodPressure": 72,
                "skinThickness": 22,
                "diabetesPedigreeFunction": 0.35,
                "age": 35,
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn(body["prediction"], (0, 1))
        self.assertGreaterEqual(body["probability"], 0)
        self.assertLessEqual(body["probability"], 1)

    def test_predict_rejects_missing_or_out_of_range_fields(self) -> None:
        response = self.client.post("/api/predict", json={"glucose": 120})

        self.assertEqual(response.status_code, 422)

        response = self.client.post(
            "/api/predict",
            json={
                "glucose": 301,
                "bmi": 28.5,
                "cholesterol": 200,
                "insulin": 80,
                "bloodPressure": 72,
                "skinThickness": 22,
                "diabetesPedigreeFunction": 0.35,
                "age": 35,
            },
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
