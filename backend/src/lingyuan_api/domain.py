import unicodedata
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

Kind = Literal["opinion", "case", "counterexample"]


def normalize_body(value: str) -> str:
    normalized = unicodedata.normalize("NFC", value.strip())
    return "".join(
        char for char in normalized if char == "\n" or unicodedata.category(char) != "Cc"
    ).strip()


class Submission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Kind
    body: str
    website: str = ""

    @field_validator("body")
    @classmethod
    def clean_body(cls, value: str) -> str:
        return normalize_body(value)
