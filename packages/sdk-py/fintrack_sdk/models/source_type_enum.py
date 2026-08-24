from enum import Enum


class SourceTypeEnum(str, Enum):
    IMPORT = "import"
    MANUAL = "manual"
    RULE = "rule"
    SCHEDULED = "scheduled"
    SYNC = "sync"
    TRANSFER = "transfer"

    def __str__(self) -> str:
        return str(self.value)
