from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.notification_preference import NotificationPreference
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    body: NotificationPreference | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "put",
        "url": "/api/v1/notifications/preferences/",
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> NotificationPreference | None:
    if response.status_code == 200:
        response_200 = NotificationPreference.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[NotificationPreference]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    body: NotificationPreference | Unset = UNSET,
) -> Response[NotificationPreference]:
    """One row per user, created on first access - see the model's docstring.

    A GET before any Save is what powers the settings tab showing sensible
    defaults (budget alerts on, threshold 90%, everything else off) rather
    than a 404 for every user who has never touched this tab.

    Args:
        body (NotificationPreference | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[NotificationPreference]
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
    body: NotificationPreference | Unset = UNSET,
) -> NotificationPreference | None:
    """One row per user, created on first access - see the model's docstring.

    A GET before any Save is what powers the settings tab showing sensible
    defaults (budget alerts on, threshold 90%, everything else off) rather
    than a 404 for every user who has never touched this tab.

    Args:
        body (NotificationPreference | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        NotificationPreference
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    body: NotificationPreference | Unset = UNSET,
) -> Response[NotificationPreference]:
    """One row per user, created on first access - see the model's docstring.

    A GET before any Save is what powers the settings tab showing sensible
    defaults (budget alerts on, threshold 90%, everything else off) rather
    than a 404 for every user who has never touched this tab.

    Args:
        body (NotificationPreference | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[NotificationPreference]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    body: NotificationPreference | Unset = UNSET,
) -> NotificationPreference | None:
    """One row per user, created on first access - see the model's docstring.

    A GET before any Save is what powers the settings tab showing sensible
    defaults (budget alerts on, threshold 90%, everything else off) rather
    than a 404 for every user who has never touched this tab.

    Args:
        body (NotificationPreference | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        NotificationPreference
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
