from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from app.core.config import settings

hazard_db_url = getattr(settings, "HAZARD_DATABASE_URL", None)
if not hazard_db_url or ("localhost" in str(hazard_db_url) and "localhost" not in str(settings.DATABASE_URL)):
    hazard_db_url = settings.DATABASE_URL

hazard_engine = create_engine(
    hazard_db_url,
    echo=getattr(settings, "DB_ECHO", False),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

HazardSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=hazard_engine)


def get_hazard_db() -> Generator[Session, None, None]:
    """Dependency for obtaining a SQLAlchemy DB session for Person 2 Hazard intelligence."""
    db = HazardSessionLocal()
    try:
        yield db
    finally:
        db.close()
