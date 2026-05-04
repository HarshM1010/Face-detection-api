"""Face detection service using MediaPipe (no OpenCV).

Detects faces in individual frames using MediaPipe's Face Detection model
and returns axis-aligned bounding boxes.
"""

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np
import mediapipe as mp

logger = logging.getLogger(__name__)


@dataclass
class FaceROI:
    """Axis-aligned minimal bounding box for a detected face."""
    x_min: int
    y_min: int
    x_max: int
    y_max: int
    confidence: float


class FaceDetector:
    """Wraps MediaPipe Face Detection for single-face detection in frames.

    Uses MediaPipe's short-range face detection model which works well
    for faces within 2 meters of the camera.
    """

    def __init__(self, min_confidence: float = 0.5):
        """Initialize the face detector.

        Args:
            min_confidence: Minimum detection confidence threshold (0-1).
        """
        self.min_confidence = min_confidence
        self._detector = None

    def _get_detector(self):
        """Lazy-initialize the MediaPipe face detector."""
        if self._detector is None:
            mp_face = mp.solutions.face_detection
            self._detector = mp_face.FaceDetection(
                model_selection=0,  # 0 = short-range, 1 = full-range
                min_detection_confidence=self.min_confidence,
            )
        return self._detector

    def detect(self, frame: np.ndarray) -> Optional[FaceROI]:
        """Detect a single face in an RGB frame.

        Args:
            frame: RGB image as numpy array with shape (H, W, 3).

        Returns:
            FaceROI with bounding box coordinates, or None if no face found.
        """
        if frame is None or frame.size == 0:
            logger.warning("Empty frame passed to face detector")
            return None

        height, width, _ = frame.shape
        detector = self._get_detector()

        # MediaPipe expects RGB input
        results = detector.process(frame)

        if not results.detections:
            return None

        # Take the first (highest confidence) detection
        detection = results.detections[0]
        bbox = detection.location_data.relative_bounding_box

        # Convert relative coordinates to absolute pixel coordinates
        x_min = max(0, int(bbox.xmin * width))
        y_min = max(0, int(bbox.ymin * height))
        x_max = min(width, int((bbox.xmin + bbox.width) * width))
        y_max = min(height, int((bbox.ymin + bbox.height) * height))

        confidence = detection.score[0] if detection.score else 0.0

        return FaceROI(
            x_min=x_min,
            y_min=y_min,
            x_max=x_max,
            y_max=y_max,
            confidence=round(confidence, 4),
        )

    def close(self):
        """Release MediaPipe resources."""
        if self._detector:
            self._detector.close()
            self._detector = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
