from enum import Enum


class ProviderEnum(str, Enum):
    GOCARDLESS = "gocardless"
    SIMPLEFIN = "simplefin"

    def __str__(self) -> str:
        return str(self.value)
