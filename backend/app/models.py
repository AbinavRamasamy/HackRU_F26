from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import json
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    walking_speed = Column(String(50), default="Stride") 
    prefer_walking = Column(Boolean, default=True)
    max_walking_distance = Column(String(50), default="1/2 A Mile")
    avoid_bad_weather = Column(Boolean, default=True)
    avoid_rain = Column(Boolean, default=True)
    avoid_snow = Column(Boolean, default=True)
    calendar_url = Column(Text, nullable=True)
    calendar_synced_at = Column(DateTime, nullable=True)
    willing_to_walk_further = Column(Boolean, default=True)
    priority = Column(String(30), default="fastest_arrival")
    created_at = Column(DateTime, default=datetime.utcnow)

    classes = relationship("UserClass", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "username": self.username,
            "password": self.password_hash,
            "walking_speed": self.walking_speed,
            "prefer_walking": self.prefer_walking,
            "max_walking_distance": self.max_walking_distance,
            "avoid_bad_weather": self.avoid_bad_weather,
            "classes": [c.to_dict() for c in self.classes]
        }


class UserClass(Base):
    __tablename__ = "user_classes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course = Column(String(255), nullable=True)
    building = Column(String(255), nullable=True)
    start_time = Column(String(50), nullable=True)
    end_time = Column(String(50), nullable=True)
    days = Column(Text, nullable=True)  # JSON-encoded array: ["M", "TH"]
    days_display = Column(String(100), nullable=True)
    campus = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    zoom_link = Column(String(500), nullable=True)

    user = relationship("User", back_populates="classes")

    def to_dict(self):
        days_parsed = []
        if self.days:
            try:
                days_parsed = json.loads(self.days)
            except Exception:
                days_parsed = [d.strip() for d in self.days.split(",") if d.strip()]

        return {
            "course": self.course or "",
            "building": self.building or "",
            "startTime": self.start_time or "",
            "endTime": self.end_time or "",
            "days": days_parsed,
            "days_display": self.days_display or "",
            "campus": self.campus or "",
            "location": self.location or "",
            "zoom_link": self.zoom_link or ""
        }
