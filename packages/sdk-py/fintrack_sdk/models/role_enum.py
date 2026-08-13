from enum import Enum


class RoleEnum(str, Enum):
    ADMIN = "admin"
    EMPLOYEE = "employee"
    MANAGER = "manager"

    def __str__(self) -> str:
        return str(self.value)
