from enum import Enum


class ImportJobStatusEnum(str, Enum):
    COMPLETED = "completed"
    FAILED = "failed"
    IMPORTING = "importing"
    PREVIEWED = "previewed"
    UPLOADED = "uploaded"

    def __str__(self) -> str:
        return str(self.value)
