"""Video processing pipeline — reads frames, detects faces, draws ROI, writes output.

Uses imageio for video I/O and Pillow for drawing bounding boxes.
No OpenCV dependency.
"""

import logging
import os
from typing import List, Tuple
from pathlib import Path

import imageio.v3 as iio
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy.orm import Session

from app.models.video import Video
from app.models.roi import ROIData
from app.services.face_detector import FaceDetector, FaceROI

logger = logging.getLogger(__name__)

# ROI drawing style
ROI_COLOR = (0, 255, 100)  # Green
ROI_LINE_WIDTH = 3
LABEL_BG_COLOR = (0, 255, 100, 180)
LABEL_TEXT_COLOR = (0, 0, 0)


def draw_roi_on_frame(frame: np.ndarray, roi: FaceROI) -> np.ndarray:
    """Draw an axis-aligned bounding box on a frame using Pillow.

    Args:
        frame: RGB numpy array (H, W, 3).
        roi: Detected face bounding box.

    Returns:
        New frame with the ROI rectangle drawn.
    """
    img = Image.fromarray(frame)
    draw = ImageDraw.Draw(img, "RGBA")

    # Draw the bounding box rectangle
    draw.rectangle(
        [(roi.x_min, roi.y_min), (roi.x_max, roi.y_max)],
        outline=ROI_COLOR,
        width=ROI_LINE_WIDTH,
    )

    # Draw confidence label above the box
    label = f"Face {roi.confidence:.1%}"
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    except (IOError, OSError):
        font = ImageFont.load_default()

    text_bbox = draw.textbbox((0, 0), label, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]

    label_x = roi.x_min
    label_y = max(0, roi.y_min - text_h - 8)

    # Background for label
    draw.rectangle(
        [(label_x, label_y), (label_x + text_w + 8, label_y + text_h + 6)],
        fill=LABEL_BG_COLOR,
    )
    draw.text((label_x + 4, label_y + 2), label, fill=LABEL_TEXT_COLOR, font=font)

    return np.array(img)


def process_video(video_id: str, db: Session) -> None:
    """Full video processing pipeline.

    1. Read the original video frame by frame.
    2. Run face detection on each frame.
    3. Draw ROI on frames where a face is found.
    4. Store ROI data in the database.
    5. Write the processed video.

    Args:
        video_id: UUID of the video record.
        db: Database session.
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        logger.error(f"Video {video_id} not found in database")
        return

    try:
        # Update status
        video.status = "processing"
        db.commit()

        logger.info(f"Starting processing for video: {video.filename}")

        # Read video metadata using imageio
        meta = iio.immeta(video.original_path, plugin="pyav")
        fps = meta.get("fps", 30.0)
        duration = meta.get("duration", 0)

        # Read all frames
        frames = iio.imread(video.original_path, plugin="pyav")

        if len(frames) == 0:
            raise ValueError("Video contains no frames")

        height, width = frames[0].shape[:2]
        frame_count = len(frames)

        logger.info(
            f"Video info: {width}x{height}, {fps:.1f} FPS, {frame_count} frames"
        )

        # Update video metadata
        video.width = width
        video.height = height
        video.fps = fps
        video.frame_count = frame_count
        db.commit()

        # Process frames
        detector = FaceDetector(min_confidence=0.5)
        processed_frames = []
        roi_records = []

        for frame_num, frame in enumerate(frames):
            # Detect face
            roi = detector.detect(frame)

            if roi:
                # Draw ROI on frame
                frame = draw_roi_on_frame(frame, roi)

                # Store ROI data
                roi_record = ROIData(
                    video_id=video.id,
                    frame_number=frame_num,
                    x_min=roi.x_min,
                    y_min=roi.y_min,
                    x_max=roi.x_max,
                    y_max=roi.y_max,
                    confidence=roi.confidence,
                )
                roi_records.append(roi_record)

            processed_frames.append(frame)

            # Log progress every 30 frames
            if frame_num % 30 == 0:
                logger.info(
                    f"Processed frame {frame_num}/{frame_count} "
                    f"({'face found' if roi else 'no face'})"
                )

        detector.close()

        # Bulk insert ROI data
        if roi_records:
            db.bulk_save_objects(roi_records)
            db.commit()
            logger.info(f"Stored {len(roi_records)} ROI records")

        # Write processed video
        output_filename = f"processed_{video.filename}"
        # Ensure output has .mp4 extension for compatibility
        output_stem = Path(output_filename).stem
        output_filename = f"{output_stem}.mp4"
        output_path = os.path.join("/app/processed", output_filename)

        processed_array = np.stack(processed_frames)
        iio.imwrite(
            output_path,
            processed_array,
            plugin="pyav",
            codec="libx264",
            fps=fps,
        )

        logger.info(f"Processed video written to: {output_path}")

        # Update video record
        video.processed_path = output_path
        video.status = "completed"
        db.commit()

    except Exception as e:
        logger.exception(f"Failed to process video {video_id}: {e}")
        video.status = "failed"
        video.error_message = str(e)[:500]
        db.commit()
        raise
