from enum import Enum


class SourceTypeEnum(str, Enum):
    IMPORT = "import"
    MANUAL = "manual"
    RULE = "rule"
    SCHEDULED = "scheduled"
    TRANSFER = "transfer"

    def __str__(self) -> str:
        return str(self.value)
