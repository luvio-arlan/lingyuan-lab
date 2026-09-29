import secrets
from typing import Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    rate_limit_salt: str = secrets.token_hex(32)
    trusted_proxy: str | None = None
    rate_limit_ten_minutes: int = 5
    rate_limit_day: int = 20
    rate_limit_topic_hour: int = 60
    body_min: int = 20
    body_max: int = 2000

    @model_validator(mode="after")
    def valid_limits(self) -> Self:
        if min(self.rate_limit_ten_minutes, self.rate_limit_day, self.rate_limit_topic_hour) < 1:
            raise ValueError("rate limits must be positive")
        if self.body_min < 1 or self.body_max < self.body_min:
            raise ValueError("invalid body length bounds")
        return self
