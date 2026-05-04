"""Pydantic schemas for ROI data responses."""

from datetime import datetime
from uuid import UUID
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class ROIResponse(BaseModel):
    """Single ROI data point for one frame."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    video_id: UUID
    frame_number: int
    x_min: int
    y_min: int
    x_max: int
    y_max: int
    confidence: Optional[float] = None
    created_at: datetime


class ROIListResponse(BaseModel):
    """List of ROI data for a video."""
    video_id: UUID
    total_frames: int
    faces_detected: int
    roi_data: List[ROIResponse]
