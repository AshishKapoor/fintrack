from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.ai_categorization_settings import AICategorizationSettings
from ...models.patched_ai_categorization_settings import PatchedAICategorizationSettings
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    body: PatchedAICategorizationSettings | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/finance/ai-categorization/settings/",
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> AICategorizationSettings | None:
    if response.status_code == 200:
        response_200 = AICategorizationSettings.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[AICategorizationSettings]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    body: PatchedAICategorizationSettings | Unset = UNSET,
) -> Response[AICategorizationSettings]:
    """One row per budget file, created on first access - mirrors
    NotificationPreferenceView's exact pattern (pft/views.py), scoped to a
    budget file instead of a user since this holds a credential (see the
    model's docstring). GET only needs read access so a viewer can see
    whether it's on; PATCH needs write, checked explicitly since
    RetrieveUpdateAPIView has no perform_update hook of its own to route
    through UserScopedModelViewSet's version.

    Args:
        body (PatchedAICategorizationSettings | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AICategorizationSettings]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    body: PatchedAICategorizationSettings | Unset = UNSET,
) -> AICategorizationSettings | None:
    """One row per budget file, created on first access - mirrors
    NotificationPreferenceView's exact pattern (pft/views.py), scoped to a
    budget file instead of a user since this holds a credential (see the
    model's docstring). GET only needs read access so a viewer can see
    whether it's on; PATCH needs write, checked explicitly since
    RetrieveUpdateAPIView has no perform_update hook of its own to route
    through UserScopedModelViewSet's version.

    Args:
        body (PatchedAICategorizationSettings | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AICategorizationSettings
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    body: PatchedAICategorizationSettings | Unset = UNSET,
) -> Response[AICategorizationSettings]:
    """One row per budget file, created on first access - mirrors
    NotificationPreferenceView's exact pattern (pft/views.py), scoped to a
    budget file instead of a user since this holds a credential (see the
    model's docstring). GET only needs read access so a viewer can see
    whether it's on; PATCH needs write, checked explicitly since
    RetrieveUpdateAPIView has no perform_update hook of its own to route
    through UserScopedModelViewSet's version.

    Args:
        body (PatchedAICategorizationSettings | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AICategorizationSettings]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    body: PatchedAICategorizationSettings | Unset = UNSET,
) -> AICategorizationSettings | None:
    """One row per budget file, created on first access - mirrors
    NotificationPreferenceView's exact pattern (pft/views.py), scoped to a
    budget file instead of a user since this holds a credential (see the
    model's docstring). GET only needs read access so a viewer can see
    whether it's on; PATCH needs write, checked explicitly since
    RetrieveUpdateAPIView has no perform_update hook of its own to route
    through UserScopedModelViewSet's version.

    Args:
        body (PatchedAICategorizationSettings | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AICategorizationSettings
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
