"""API integration tests using FastAPI TestClient."""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock
from uuid import uuid4

# Need to mock database before importing app
os.environ["DATABASE_URL"] = "sqlite:///./test.db"


class TestHealthEndpoint:
    """Test the health check endpoint."""

    def test_health_returns_200(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data


class TestUploadEndpoint:
    """Test the video upload endpoint."""

    def test_upload_no_file_returns_422(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.post("/api/v1/video/upload")
        assert response.status_code == 422  # Missing required field

    def test_upload_invalid_extension_returns_400(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.post(
            "/api/v1/video/upload",
            files={"file": ("test.txt", b"not a video", "text/plain")},
        )
        assert response.status_code == 400
        assert "not allowed" in response.json()["detail"]

    def test_upload_empty_file_returns_400(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.post(
            "/api/v1/video/upload",
            files={"file": ("test.mp4", b"", "video/mp4")},
        )
        assert response.status_code == 400


class TestStreamEndpoint:
    """Test the video stream endpoint."""

    def test_stream_nonexistent_video_returns_404(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/video/{fake_id}/stream")
        assert response.status_code == 404


class TestROIEndpoint:
    """Test the ROI data endpoint."""

    def test_roi_nonexistent_video_returns_404(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/video/{fake_id}/roi")
        assert response.status_code == 404


class TestStatusEndpoint:
    """Test the status endpoint."""

    def test_status_nonexistent_video_returns_404(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/video/{fake_id}/status")
        assert response.status_code == 404
