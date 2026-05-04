"""Shared test fixtures and configuration."""

import os
import sys
import pytest
import numpy as np
from unittest.mock import MagicMock

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture
def sample_rgb_frame():
    """Create a sample 480x640 RGB frame for testing."""
    return np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)


@pytest.fixture
def blank_frame():
    """Create a blank (black) 480x640 frame — no face should be detected."""
    return np.zeros((480, 640, 3), dtype=np.uint8)


@pytest.fixture
def mock_face_roi():
    """Create a mock FaceROI object."""
    from app.services.face_detector import FaceROI
    return FaceROI(x_min=100, y_min=80, x_max=300, y_max=350, confidence=0.95)
