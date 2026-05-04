"""Unit tests for the face detection service."""

import numpy as np
import pytest
from unittest.mock import patch, MagicMock

from app.services.face_detector import FaceDetector, FaceROI


class TestFaceROI:
    """Tests for the FaceROI dataclass."""

    def test_create_roi(self):
        roi = FaceROI(x_min=10, y_min=20, x_max=100, y_max=200, confidence=0.92)
        assert roi.x_min == 10
        assert roi.y_min == 20
        assert roi.x_max == 100
        assert roi.y_max == 200
        assert roi.confidence == 0.92

    def test_roi_width_height(self):
        roi = FaceROI(x_min=50, y_min=50, x_max=150, y_max=250, confidence=0.8)
        assert roi.x_max - roi.x_min == 100  # width
        assert roi.y_max - roi.y_min == 200  # height


class TestFaceDetector:
    """Tests for the FaceDetector service."""

    def test_init_default_confidence(self):
        detector = FaceDetector()
        assert detector.min_confidence == 0.5

    def test_init_custom_confidence(self):
        detector = FaceDetector(min_confidence=0.8)
        assert detector.min_confidence == 0.8

    def test_detect_returns_none_for_empty_frame(self):
        detector = FaceDetector()
        empty = np.array([], dtype=np.uint8)
        result = detector.detect(empty)
        assert result is None

    def test_detect_returns_none_for_none_frame(self):
        detector = FaceDetector()
        result = detector.detect(None)
        assert result is None

    def test_detect_returns_none_on_blank_frame(self, blank_frame):
        """A solid black frame should not contain a detectable face."""
        detector = FaceDetector()
        result = detector.detect(blank_frame)
        assert result is None
        detector.close()

    @patch("app.services.face_detector.mp.solutions.face_detection")
    def test_detect_returns_roi_when_face_found(self, mock_mp):
        """Mocked test: when MediaPipe finds a face, we should get an ROI back."""
        # Mock the detection result
        mock_detection = MagicMock()
        mock_detection.location_data.relative_bounding_box.xmin = 0.2
        mock_detection.location_data.relative_bounding_box.ymin = 0.1
        mock_detection.location_data.relative_bounding_box.width = 0.3
        mock_detection.location_data.relative_bounding_box.height = 0.5
        mock_detection.score = [0.95]

        mock_detector_instance = MagicMock()
        mock_detector_instance.process.return_value.detections = [mock_detection]
        mock_mp.FaceDetection.return_value = mock_detector_instance

        detector = FaceDetector()
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        roi = detector.detect(frame)

        assert roi is not None
        assert isinstance(roi, FaceROI)
        assert roi.x_min == 128   # 0.2 * 640
        assert roi.y_min == 48    # 0.1 * 480
        assert roi.x_max == 320   # (0.2 + 0.3) * 640
        assert roi.y_max == 288   # (0.1 + 0.5) * 480
        assert roi.confidence == 0.95

    def test_context_manager(self):
        """Test that FaceDetector works as a context manager."""
        with FaceDetector() as detector:
            assert detector is not None
        # After exit, detector should be cleaned up

    def test_close_without_init(self):
        """Closing before any detection should not raise."""
        detector = FaceDetector()
        detector.close()  # Should not raise
