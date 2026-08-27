"""Shared test helpers.

Small on purpose: things every suite needs to say, said once, through the same
tenancy path the application uses rather than a shortcut around it.
"""

from pft.models import BudgetFile
from pft.tenancy import default_budget_file, personal_organization


def personal_budget_file(user) -> BudgetFile:
    """The budget file signup created in `user`'s personal workspace.

    Tests used to reach for `BudgetFile.objects.get(user=..., is_default=True)`.
    Both halves of that are gone: budget files belong to an organization, not a
    user, and "default" is now a per-membership choice. Going through
    `tenancy.default_budget_file` means the helper keeps agreeing with what the
    API would actually serve.
    """
    organization = personal_organization(user)
    assert organization is not None, f"{user} has no personal workspace"

    budget_file = default_budget_file(user, organization)
    assert budget_file is not None, f"{user}'s personal workspace has no budget file"
    return budget_file
