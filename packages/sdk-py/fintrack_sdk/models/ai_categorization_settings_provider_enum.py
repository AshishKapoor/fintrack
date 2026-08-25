from enum import Enum


class AICategorizationSettingsProviderEnum(str, Enum):
    OLLAMA = "ollama"
    OPENAI_COMPATIBLE = "openai_compatible"

    def __str__(self) -> str:
        return str(self.value)
