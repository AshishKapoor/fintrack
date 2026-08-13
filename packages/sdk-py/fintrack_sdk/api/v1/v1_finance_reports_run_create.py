from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.saved_report import SavedReport
from ...types import Response


def _get_kwargs(
    *,
    body: SavedReport,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/finance/reports/run/",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> SavedReport | None:
    if response.status_code == 200:
        response_200 = SavedReport.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[SavedReport]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    body: SavedReport,
) -> Response[SavedReport]:
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.

    Args:
        body (SavedReport):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[SavedReport]
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
    body: SavedReport,
) -> SavedReport | None:
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.

    Args:
        body (SavedReport):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        SavedReport
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    body: SavedReport,
) -> Response[SavedReport]:
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.

    Args:
        body (SavedReport):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[SavedReport]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    body: SavedReport,
) -> SavedReport | None:
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.

    Args:
        body (SavedReport):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        SavedReport
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
