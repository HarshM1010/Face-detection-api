"""Video API endpoints — upload, stream, and ROI data."""

import os
import uuid
import logging
from pathlib import Path
from threading import Thread

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, SessionLocal
from app.models.video import Video
from app.models.roi import ROIData
from app.schemas.video import VideoUploadResponse, VideoResponse
from app.schemas.roi import ROIResponse, ROIListResponse
from app.services.video_processor import process_video

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/video", tags=["Video"])


def _validate_file_extension(filename: str) -> None:
    """Validate that the uploaded file has an allowed extension."""
    ext = Path(filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )


def _process_in_background(video_id: str) -> None:
    """Run video processing in a background thread with its own DB session."""
    db = SessionLocal()
    try:
        process_video(video_id, db)
    except Exception as e:
        logger.exception(f"Background processing failed for {video_id}: {e}")
    finally:
        db.close()


# ─── Endpoint 1: Upload video feed ──────────────────────────────────────────

@router.post(
    "/upload",
    response_model=VideoUploadResponse,
    status_code=201,
    summary="Upload a video for face detection processing",
    responses={
        400: {"description": "Invalid file type or empty file"},
        413: {"description": "File too large"},
    },
)
async def upload_video(
    file: UploadFile = File(..., description="Video file to process"),
    db: Session = Depends(get_db),
):
    """Upload a video file. Processing starts automatically in the background.

    The video will be analyzed frame-by-frame for face detection.
    Detected faces will have axis-aligned bounding boxes (ROI) drawn on them.
    """
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    _validate_file_extension(file.filename)

    # Read file content
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Check size limit
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Max: {settings.MAX_UPLOAD_SIZE_MB} MB",
        )

    # Save to disk with unique name
    file_ext = Path(file.filename).suffix.lower()
    unique_name = f"{uuid.uuid4()}{file_ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    with open(save_path, "wb") as f:
        f.write(content)

    logger.info(f"Saved upload: {file.filename} -> {save_path} ({size_mb:.1f} MB)")

    # Create database record
    video = Video(
        filename=file.filename,
        original_path=save_path,
        status="pending",
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    # Start processing in background
    thread = Thread(target=_process_in_background, args=(str(video.id),), daemon=True)
    thread.start()

    return VideoUploadResponse(
        id=video.id,
        filename=video.filename,
        status="processing",
        message="Video uploaded successfully. Processing started.",
    )


# ─── Endpoint 2: Stream / serve the processed video ─────────────────────────

@router.get(
    "/{video_id}/stream",
    summary="Stream the processed video with face detection ROI overlay",
    responses={
        404: {"description": "Video not found"},
        202: {"description": "Video still processing"},
    },
)
async def stream_video(
    video_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Serve the processed video file with face detection bounding boxes drawn.

    Returns 202 if the video is still being processed.
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if video.status == "processing" or video.status == "pending":
        raise HTTPException(
            status_code=202,
            detail={
                "status": video.status,
                "message": "Video is still being processed. Try again shortly.",
            },
        )

    if video.status == "failed":
        raise HTTPException(
            status_code=422,
            detail={
                "status": "failed",
                "message": "Video processing failed.",
                "error": video.error_message,
            },
        )

    if not video.processed_path or not os.path.exists(video.processed_path):
        raise HTTPException(
            status_code=500,
            detail="Processed video file not found on disk",
        )

    return FileResponse(
        path=video.processed_path,
        media_type="video/mp4",
        filename=f"processed_{video.filename}",
        headers={"Accept-Ranges": "bytes"},
    )


# ─── Endpoint 3: Get ROI data ───────────────────────────────────────────────

@router.get(
    "/{video_id}/roi",
    response_model=ROIListResponse,
    summary="Get face detection ROI data for all frames",
    responses={
        404: {"description": "Video not found"},
    },
)
async def get_roi_data(
    video_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Return all ROI (bounding box) data for a processed video.

    Each entry contains the frame number and the axis-aligned bounding box
    coordinates (x_min, y_min, x_max, y_max) of the detected face.
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    roi_records = (
        db.query(ROIData)
        .filter(ROIData.video_id == video_id)
        .order_by(ROIData.frame_number)
        .all()
    )

    return ROIListResponse(
        video_id=video.id,
        total_frames=video.frame_count or 0,
        faces_detected=len(roi_records),
        roi_data=[ROIResponse.model_validate(r) for r in roi_records],
    )


# ─── Bonus: Get video status ────────────────────────────────────────────────

@router.get(
    "/{video_id}/status",
    response_model=VideoResponse,
    summary="Check video processing status",
    responses={
        404: {"description": "Video not found"},
    },
)
async def get_video_status(
    video_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Check the current processing status of an uploaded video."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    return VideoResponse.model_validate(video)
