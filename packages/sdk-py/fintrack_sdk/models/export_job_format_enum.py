from enum import Enum


class ExportJobFormatEnum(str, Enum):
    CSV = "csv"
    JSON = "json"
    XLSX = "xlsx"

    def __str__(self) -> str:
        return str(self.value)
