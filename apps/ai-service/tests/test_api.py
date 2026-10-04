import pytest
import sys
import os
from unittest.mock import MagicMock
import numpy as np

# Ensure apps/ai-service is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
import main
from main import app, INTERNAL_TOKEN

client = TestClient(app)
AUTH_HEADERS = {"X-Internal-Token": INTERNAL_TOKEN}

def test_health_check_public():
    # Health check is public (no auth required)
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model" in data
    assert "device" in data

def test_embed_endpoint_rejects_missing_token():
    # Protected endpoint rejects requests without internal token
    response = client.post("/embed", json={"text": "hello"})
    assert response.status_code == 401
    assert "Unauthorized" in response.json()["detail"]

def test_embed_endpoint_rejects_invalid_token():
    # Protected endpoint rejects invalid token
    response = client.post(
        "/embed",
        json={"text": "hello"},
        headers={"X-Internal-Token": "invalid_wrong_secret"},
    )
    assert response.status_code == 401

def test_embed_endpoint_mocked_with_valid_token():
    # Mock the embedding model
    mock_model = MagicMock()
    mock_model.encode.return_value = np.array([0.1, 0.2, 0.3])
    original_model = main.embed_model
    main.embed_model = mock_model

    try:
        response = client.post(
            "/embed",
            json={"text": "hello world"},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert "embedding" in data
        assert len(data["embedding"]) == 3
        assert data["embedding"] == [0.1, 0.2, 0.3]
    finally:
        main.embed_model = original_model

def test_embed_empty_text():
    mock_model = MagicMock()
    original_model = main.embed_model
    main.embed_model = mock_model

    try:
        response = client.post(
            "/embed",
            json={"text": "   "},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        assert response.json() == {"embedding": []}
    finally:
        main.embed_model = original_model

def test_transcribe_endpoint_mocked():
    import io
    import wave

    mock_model = MagicMock()
    mock_segment = MagicMock()
    mock_segment.text = "Hello from audio test"
    mock_info = MagicMock()
    mock_info.language = "en"
    mock_info.language_probability = 0.98
    mock_model.transcribe.return_value = ([mock_segment], mock_info)

    original_model = main.model
    main.model = mock_model

    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(b'\x00\x00' * 1600)
    buf.seek(0)

    try:
        response = client.post(
            "/transcribe",
            files={"file": ("test.wav", buf, "audio/wav")},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["text"] == "Hello from audio test"
        assert data["language"] == "en"
        assert data["speaker"] == "Meeting"
    finally:
        main.model = original_model

def test_embed_batch_endpoint_mocked():
    mock_model = MagicMock()
    mock_model.encode.return_value = np.array([[0.1, 0.2], [0.3, 0.4]])
    original_model = main.embed_model
    main.embed_model = mock_model

    try:
        response = client.post(
            "/embed",
            json={"texts": ["hello", "world"]},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert "embeddings" in data
        assert len(data["embeddings"]) == 2
        assert data["embeddings"][0] == [0.1, 0.2]
        assert data["embeddings"][1] == [0.3, 0.4]
    finally:
        main.embed_model = original_model


