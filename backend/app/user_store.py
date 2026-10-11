import json
import hashlib
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.models import User, UserClass

# Ensure SQL tables exist on import
def init_db():
    Base.metadata.create_all(bind=engine)

init_db()
USER_FIELDS = ["calendar_url", "calendar_synced_at", "willing_to_walk_further", "priority", "avoid_rain", "avoid_snow"]
def get_db_session() -> Session:
    return SessionLocal()

# =========================================================================
# BACKWARD COMPATIBLE INTERFACE (For existing callers like sign_up.py)
# =========================================================================

def load_users() -> Dict[str, Any]:
    """Loads all registered users from the SQL database and returns a dict keyed by username."""
    session = get_db_session()
    try:
        users = session.query(User).all()
        result = {}
        for u in users:
            result[u.username] = {
                "password": u.password_hash,
                "walking_speed": u.walking_speed,
                "prefer_walking": u.prefer_walking,
                "max_walking_distance": u.max_walking_distance,
                "avoid_bad_weather": u.avoid_bad_weather,
                **{f: getattr(u, f) for f in USER_FIELDS},
                "classes": [c.to_dict() for c in u.classes]
            }
        return result
    finally:
        session.close()


def save_users(users_dict: Dict[str, Any]) -> None:
    """Synchronizes a dictionary of users into the SQL database."""
    session = get_db_session()
    try:
        for username, data in users_dict.items():
            username_clean = username.strip().lower()
            user = session.query(User).filter(User.username == username_clean).first()

            if not user:
                user = User(
                    username=username_clean,
                    password_hash=data.get("password", ""),
                    walking_speed=data.get("walking_speed", "Stride"),                    
                    prefer_walking=bool(data.get("prefer_walking", True)),
                    max_walking_distance=data.get("max_walking_distance", "1/2 A Mile"),
                    avoid_bad_weather=bool(data.get("avoid_bad_weather", True))
                )
                session.add(user)
                session.flush()
            else:
                if "password" in data:
                    user.password_hash = data["password"]
                if "walking_speed" in data:
                    user.walking_speed = data["walking_speed"]
                if "prefer_walking" in data:
                    user.prefer_walking = bool(data["prefer_walking"])
                if "max_walking_distance" in data:
                    user.max_walking_distance = data["max_walking_distance"]
                if "avoid_bad_weather" in data:
                    user.avoid_bad_weather = bool(data["avoid_bad_weather"])

            for f in USER_FIELDS:
                if f in data:
                    setattr(user, f, data[f])
            # Update classes if present
            if "classes" in data:
                # Remove existing classes
                session.query(UserClass).filter(UserClass.user_id == user.id).delete()
                # Insert new classes
                for c in data["classes"]:
                    days_val = c.get("days", [])
                    days_json = json.dumps(days_val) if isinstance(days_val, list) else str(days_val)
                    cls_item = UserClass(
                        user_id=user.id,
                        course=c.get("course", ""),
                        building=c.get("building", ""),
                        start_time=c.get("startTime", ""),
                        end_time=c.get("endTime", ""),
                        days=days_json,
                        days_display=c.get("days_display", ""),
                        campus=c.get("campus", ""),
                        location=c.get("location", ""),
                        zoom_link=c.get("zoom_link", "")
                    )
                    session.add(cls_item)

        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


# =========================================================================
# HIGH-PERFORMANCE DIRECT SQL CRUD METHODS
# =========================================================================

def get_user_by_username(username: str, db: Optional[Session] = None) -> Optional[User]:
    clean = username.strip().lower()
    close_session = False
    if db is None:
        db = get_db_session()
        close_session = True
    try:
        return db.query(User).filter(User.username == clean).first()
    finally:
        if close_session:
            db.close()


def create_user_record(
    username: str,
    password_hash: str,
    walking_speed: str = "Stride",
    prefer_walking: bool = True,
    max_walking_distance: str = "1/2 A Mile",
    avoid_bad_weather: bool = True,
    db: Optional[Session] = None
) -> User:
    clean = username.strip().lower()
    close_session = False
    if db is None:
        db = get_db_session()
        close_session = True
    try:
        new_user = User(
            username=clean,
            password_hash=password_hash,
            walking_speed=walking_speed,
            prefer_walking=prefer_walking,
            max_walking_distance=max_walking_distance,
            avoid_bad_weather=avoid_bad_weather
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        db.rollback()
        raise e
    finally:
        if close_session:
            db.close()


def save_user_classes(username: str, classes: List[Dict[str, Any]], db: Optional[Session] = None) -> bool:
    clean = username.strip().lower()
    close_session = False
    if db is None:
        db = get_db_session()
        close_session = True
    try:
        user = db.query(User).filter(User.username == clean).first()
        if not user:
            return False

        # Clear existing classes
        db.query(UserClass).filter(UserClass.user_id == user.id).delete()

        # Insert new classes
        for c in classes:
            days_val = c.get("days", [])
            days_json = json.dumps(days_val) if isinstance(days_val, list) else str(days_val)
            item = UserClass(
                user_id=user.id,
                course=c.get("course", ""),
                building=c.get("building", ""),
                start_time=c.get("startTime", ""),
                end_time=c.get("endTime", ""),
                days=days_json,
                days_display=c.get("days_display", ""),
                campus=c.get("campus", ""),
                location=c.get("location", ""),
                zoom_link=c.get("zoom_link", "")
            )
            db.add(item)

        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e
    finally:
        if close_session:
            db.close()