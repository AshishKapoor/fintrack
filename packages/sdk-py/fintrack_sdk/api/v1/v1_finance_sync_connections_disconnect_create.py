from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.sync_connection import SyncConnection
from ...types import Response


def _get_kwargs(
    id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/finance/sync-connections/{id}/disconnect/".format(
            id=quote(str(id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> SyncConnection | None:
    if response.status_code == 200:
        response_200 = SyncConnection.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[SyncConnection]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    id: str,
    *,
    client: AuthenticatedClient,
) -> Response[SyncConnection]:
    """Revoke access and stop syncing, but keep the connection (and every
    transaction it already created) as history - the same soft-state
    preference as Account.is_archived rather than a hard delete. A plain
    DELETE on this connection is still available for anyone who wants it
    gone entirely.

    Args:
        id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[SyncConnection]
    """

    kwargs = _get_kwargs(
        id=id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    id: str,
    *,
    client: AuthenticatedClient,
) -> SyncConnection | None:
    """Revoke access and stop syncing, but keep the connection (and every
    transaction it already created) as history - the same soft-state
    preference as Account.is_archived rather than a hard delete. A plain
    DELETE on this connection is still available for anyone who wants it
    gone entirely.

    Args:
        id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        SyncConnection
    """

    return sync_detailed(
        id=id,
        client=client,
    ).parsed


async def asyncio_detailed(
    id: str,
    *,
    client: AuthenticatedClient,
) -> Response[SyncConnection]:
    """Revoke access and stop syncing, but keep the connection (and every
    transaction it already created) as history - the same soft-state
    preference as Account.is_archived rather than a hard delete. A plain
    DELETE on this connection is still available for anyone who wants it
    gone entirely.

    Args:
        id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[SyncConnection]
    """

    kwargs = _get_kwargs(
        id=id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    id: str,
    *,
    client: AuthenticatedClient,
) -> SyncConnection | None:
    """Revoke access and stop syncing, but keep the connection (and every
    transaction it already created) as history - the same soft-state
    preference as Account.is_archived rather than a hard delete. A plain
    DELETE on this connection is still available for anyone who wants it
    gone entirely.

    Args:
        id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        SyncConnection
    """

    return (
        await asyncio_detailed(
            id=id,
            client=client,
        )
    ).parsed
