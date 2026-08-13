from enum import Enum


class ModeEnum(str, Enum):
    ENVELOPE = "envelope"
    TRADITIONAL = "traditional"

    def __str__(self) -> str:
        return str(self.value)
