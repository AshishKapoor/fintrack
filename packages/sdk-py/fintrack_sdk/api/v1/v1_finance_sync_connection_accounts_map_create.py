from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.sync_connection_account import SyncConnectionAccount
from ...types import UNSET, Response, Unset


def _get_kwargs(
    id: str,
    *,
    body: SyncConnectionAccount | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/finance/sync-connection-accounts/{id}/map/".format(
            id=quote(str(id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> SyncConnectionAccount | None:
    if response.status_code == 200:
        response_200 = SyncConnectionAccount.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[SyncConnectionAccount]:
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
    body: SyncConnectionAccount | Unset = UNSET,
) -> Response[SyncConnectionAccount]:
    """Point this discovered provider account at a FinTrack Account -
    either an existing one (`account_id`) or a new one created on the
    spot (`create_account: {name?, type?}`, currency defaulting to
    whatever the provider reported for this account).

    Args:
        id (str):
        body (SyncConnectionAccount | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[SyncConnectionAccount]
    """

    kwargs = _get_kwargs(
        id=id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    id: str,
    *,
    client: AuthenticatedClient,
    body: SyncConnectionAccount | Unset = UNSET,
) -> SyncConnectionAccount | None:
    """Point this discovered provider account at a FinTrack Account -
    either an existing one (`account_id`) or a new one created on the
    spot (`create_account: {name?, type?}`, currency defaulting to
    whatever the provider reported for this account).

    Args:
        id (str):
        body (SyncConnectionAccount | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        SyncConnectionAccount
    """

    return sync_detailed(
        id=id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    id: str,
    *,
    client: AuthenticatedClient,
    body: SyncConnectionAccount | Unset = UNSET,
) -> Response[SyncConnectionAccount]:
    """Point this discovered provider account at a FinTrack Account -
    either an existing one (`account_id`) or a new one created on the
    spot (`create_account: {name?, type?}`, currency defaulting to
    whatever the provider reported for this account).

    Args:
        id (str):
        body (SyncConnectionAccount | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[SyncConnectionAccount]
    """

    kwargs = _get_kwargs(
        id=id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    id: str,
    *,
    client: AuthenticatedClient,
    body: SyncConnectionAccount | Unset = UNSET,
) -> SyncConnectionAccount | None:
    """Point this discovered provider account at a FinTrack Account -
    either an existing one (`account_id`) or a new one created on the
    spot (`create_account: {name?, type?}`, currency defaulting to
    whatever the provider reported for this account).

    Args:
        id (str):
        body (SyncConnectionAccount | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        SyncConnectionAccount
    """

    return (
        await asyncio_detailed(
            id=id,
            client=client,
            body=body,
        )
    ).parsed
