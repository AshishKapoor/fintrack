from enum import Enum


class SyncConnectionStatusEnum(str, Enum):
    ACTIVE = "active"
    ERROR = "error"
    PENDING = "pending"
    REVOKED = "revoked"

    def __str__(self) -> str:
        return str(self.value)
