from fastapi.testclient import TestClient

from app.main import app
from app.services.ai_service import ai_service


def test_generate_image_contract_is_frontend_compatible(monkeypatch) -> None:
    async def mock_enhance_image_prompt(prompt: str) -> str:
        return f"enhanced: {prompt}"

    async def mock_generate_image(prompt: str) -> dict[str, str]:
        assert prompt.startswith("enhanced:")
        return {
            "filename": "generated_20260404_010203_000001.png",
            "image_data": "ZmFrZV9pbWFnZV9iYXNlNjQ=",
            "image_url": "data:image/png;base64,ZmFrZV9pbWFnZV9iYXNlNjQ=",
            "prompt": prompt,
        }

    monkeypatch.setattr(ai_service, "enhance_image_prompt", mock_enhance_image_prompt)
    monkeypatch.setattr(ai_service, "generate_image", mock_generate_image)

    client = TestClient(app)
    response = client.post(
        "/api/v1/ai/generate-image",
        json={"prompt": "a mountain at sunrise"},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["filename"].endswith(".png")
    assert payload["image_data"]
    assert payload["image_url"].startswith("data:image/")
    assert payload["prompt"].startswith("enhanced:")
    assert payload["original_prompt"] == "a mountain at sunrise"
