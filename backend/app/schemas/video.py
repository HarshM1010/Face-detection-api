"""Pydantic schemas for Video API responses."""

from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, ConfigDict


class VideoBase(BaseModel):
    """Base video fields."""
    filename: str
    status: str


class VideoUploadResponse(BaseModel):
    """Response returned after a successful video upload."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    status: str
    message: str = "Video uploaded successfully. Processing started."


class VideoResponse(BaseModel):
    """Full video details response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    status: str
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    frame_count: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
