from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


def to_camel(field: str) -> str:
    head, *tail = field.split("_")
    return head + "".join(word.capitalize() for word in tail)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class TrendPoint(CamelModel):
    time: datetime
    temp: float
    humidity: float
    air_quality: float


class LimitsOut(CamelModel):
    attention: float
    critical: float


class EnclosureLimits(CamelModel):
    temperature: LimitsOut
    air_quality: LimitsOut


class EnclosureOut(CamelModel):
    id: str
    name: str
    kind: str
    label: str
    temperature: float
    humidity: float
    air_quality: float
    light: float
    sound: float
    activity: str
    status: str
    ai_reason: str
    ai_action: str
    last_synced: str
    is_offline: bool
    limits: EnclosureLimits
    trend: list[TrendPoint] = []


class ReadingIn(CamelModel):
    temperature: float
    humidity: float
    air_quality: float
    light: float
    sound: float


class EnclosureCreate(CamelModel):
    id: str
    name: str | None = None

    @field_validator("name")
    @classmethod
    def blank_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class DeviceOut(CamelModel):
    id: str
    kind: str
    label: str
    registered: bool


class AlertOut(CamelModel):
    enclosure_id: str
    kind: str
    message: str
    created_at: datetime
    resolved: bool


class SimulationStatus(CamelModel):
    running: bool
    progress: float  # 0-1
    elapsed_seconds: int
    duration_seconds: int
    phase: str
