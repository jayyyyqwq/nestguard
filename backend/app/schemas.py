from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


def to_camel(field: str) -> str:
    head, *tail = field.split("_")
    return head + "".join(word.capitalize() for word in tail)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class TrendPoint(CamelModel):
    time: str
    temp: float
    humidity: float


class EnclosureOut(CamelModel):
    id: str
    name: str
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
    trend: list[TrendPoint] = []


class ReadingIn(CamelModel):
    temperature: float
    humidity: float
    air_quality: float
    light: float
    sound: float


class EnclosureCreate(CamelModel):
    id: str
    name: str

    @field_validator("id", "name")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value


class AlertOut(CamelModel):
    kind: str
    message: str
    created_at: datetime
    resolved: bool
