"""Unit tests for the ROI drawing function."""

import numpy as np
import pytest
from PIL import Image

from app.services.face_detector import FaceROI
from app.services.video_processor import draw_roi_on_frame


class TestDrawROI:
    """Tests for the draw_roi_on_frame function using Pillow."""

    def test_output_same_shape(self, sample_rgb_frame, mock_face_roi):
        """Output frame should have the same dimensions as input."""
        result = draw_roi_on_frame(sample_rgb_frame, mock_face_roi)
        assert result.shape == sample_rgb_frame.shape

    def test_output_is_numpy_array(self, sample_rgb_frame, mock_face_roi):
        result = draw_roi_on_frame(sample_rgb_frame, mock_face_roi)
        assert isinstance(result, np.ndarray)

    def test_roi_modifies_pixels(self, mock_face_roi):
        """Drawing an ROI on a blank frame should change some pixels."""
        blank = np.zeros((480, 640, 3), dtype=np.uint8)
        result = draw_roi_on_frame(blank, mock_face_roi)
        # The drawn rectangle should create non-zero pixels
        assert not np.array_equal(blank, result)

    def test_roi_at_edges(self):
        """ROI at frame edges should not crash."""
        frame = np.zeros((100, 100, 3), dtype=np.uint8)
        edge_roi = FaceROI(x_min=0, y_min=0, x_max=100, y_max=100, confidence=0.5)
        result = draw_roi_on_frame(frame, edge_roi)
        assert result.shape == frame.shape

    def test_small_roi(self):
        """Very small ROI should still draw without error."""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        small_roi = FaceROI(x_min=10, y_min=10, x_max=15, y_max=15, confidence=0.3)
        result = draw_roi_on_frame(frame, small_roi)
        assert result.shape == frame.shape
