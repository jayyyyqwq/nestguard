from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Enclosure(Base):
    __tablename__ = "enclosures"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # e.g. "E101"
    name: Mapped[str] = mapped_column(String)
    temperature: Mapped[float] = mapped_column(Float, default=0)
    humidity: Mapped[float] = mapped_column(Float, default=0)
    air_quality: Mapped[float] = mapped_column(Float, default=0)
    light: Mapped[float] = mapped_column(Float, default=0)
    sound: Mapped[float] = mapped_column(Float, default=0)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    readings: Mapped[list["SensorReading"]] = relationship(
        back_populates="enclosure", cascade="all, delete-orphan"
    )

    # status / ai_reason / ai_action / is_offline / last_synced / activity are
    # NOT mapped columns — app/routers/enclosures.py's _with_live_insight()
    # sets them as plain instance attributes right before serialization, the
    # same way the original code overrode ai_reason/ai_action live.

    @property
    def trend(self) -> list[dict]:
        """Last 24 sensor readings, shaped for schemas.TrendPoint."""
        points = sorted(self.readings, key=lambda r: r.created_at)[-24:]
        return [
            {"time": r.created_at.strftime("%H:%M"), "temp": r.temperature, "humidity": r.humidity}
            for r in points
        ]


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    enclosure_id: Mapped[str] = mapped_column(ForeignKey("enclosures.id"))
    temperature: Mapped[float] = mapped_column(Float)
    humidity: Mapped[float] = mapped_column(Float)
    air_quality: Mapped[float] = mapped_column(Float)
    light: Mapped[float] = mapped_column(Float)
    sound: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    enclosure: Mapped["Enclosure"] = relationship(back_populates="readings")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    enclosure_id: Mapped[str] = mapped_column(ForeignKey("enclosures.id"))
    kind: Mapped[str] = mapped_column(String)  # "attention" | "critical"
    message: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
