"""ROI (Region of Interest) model — stores face bounding box per frame."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class ROIData(Base):
    """Stores the axis-aligned bounding box of a detected face for one frame."""

    __tablename__ = "roi_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id = Column(
        UUID(as_uuid=True),
        ForeignKey("videos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    frame_number = Column(Integer, nullable=False)
    x_min = Column(Integer, nullable=False, comment="Left edge of bounding box")
    y_min = Column(Integer, nullable=False, comment="Top edge of bounding box")
    x_max = Column(Integer, nullable=False, comment="Right edge of bounding box")
    y_max = Column(Integer, nullable=False, comment="Bottom edge of bounding box")
    confidence = Column(Float, nullable=True, comment="Detection confidence 0-1")
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship back to video
    video = relationship("Video", back_populates="roi_data")

    def __repr__(self):
        return (
            f"<ROI frame={self.frame_number} "
            f"box=({self.x_min},{self.y_min})-({self.x_max},{self.y_max})>"
        )
