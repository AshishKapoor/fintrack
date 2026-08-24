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
        "url": "/api/v1/finance/sync-connections/{id}/callback/".format(
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
    """Finish linking after the user returns from the provider's own
    auth page (GoCardless), then discover the institution's accounts as
    unmapped SyncConnectionAccount rows for the user to map. A no-op
    first step for providers whose start_link already finishes (SimpleFIN)
    - the frontend calls this unconditionally after any link attempt.

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
    """Finish linking after the user returns from the provider's own
    auth page (GoCardless), then discover the institution's accounts as
    unmapped SyncConnectionAccount rows for the user to map. A no-op
    first step for providers whose start_link already finishes (SimpleFIN)
    - the frontend calls this unconditionally after any link attempt.

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
    """Finish linking after the user returns from the provider's own
    auth page (GoCardless), then discover the institution's accounts as
    unmapped SyncConnectionAccount rows for the user to map. A no-op
    first step for providers whose start_link already finishes (SimpleFIN)
    - the frontend calls this unconditionally after any link attempt.

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
    """Finish linking after the user returns from the provider's own
    auth page (GoCardless), then discover the institution's accounts as
    unmapped SyncConnectionAccount rows for the user to map. A no-op
    first step for providers whose start_link already finishes (SimpleFIN)
    - the frontend calls this unconditionally after any link attempt.

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
