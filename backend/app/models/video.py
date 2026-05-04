"""Video model — tracks uploaded and processed videos."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, Float, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Video(Base):
    """Represents an uploaded video file and its processing state."""

    __tablename__ = "videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    original_path = Column(Text, nullable=False)
    processed_path = Column(Text, nullable=True)
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        comment="pending | processing | completed | failed",
    )
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    fps = Column(Float, nullable=True)
    frame_count = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship to ROI data
    roi_data = relationship(
        "ROIData", back_populates="video", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Video {self.filename} [{self.status}]>"
