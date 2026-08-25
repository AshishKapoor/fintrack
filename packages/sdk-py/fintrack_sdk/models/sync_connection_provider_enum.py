from enum import Enum


class SyncConnectionProviderEnum(str, Enum):
    GOCARDLESS = "gocardless"
    SIMPLEFIN = "simplefin"

    def __str__(self) -> str:
        return str(self.value)
