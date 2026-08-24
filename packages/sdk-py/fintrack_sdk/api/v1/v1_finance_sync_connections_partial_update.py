from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.patched_sync_connection import PatchedSyncConnection
from ...models.sync_connection import SyncConnection
from ...types import UNSET, Response, Unset


def _get_kwargs(
    id: str,
    *,
    body: PatchedSyncConnection | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/finance/sync-connections/{id}/".format(
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
    body: PatchedSyncConnection | Unset = UNSET,
) -> Response[SyncConnection]:
    r"""Bank sync connections - ROADMAP.md Phase 2. See pft/bank_sync.py for
    the provider-agnostic contract and pft/bank_sync_gocardless.py /
    bank_sync_simplefin.py for the two shipped providers.

    Every mutating action here is already unreachable on a demo instance:
    DemoModeMiddleware blocks all non-GET requests outside a small allowlist
    that does not include any of these, so bank sync needs no separate demo
    guard - the same \"guarded by construction\" property notifications and
    imports already get for free.

    Args:
        id (str):
        body (PatchedSyncConnection | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[SyncConnection]
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
    body: PatchedSyncConnection | Unset = UNSET,
) -> SyncConnection | None:
    r"""Bank sync connections - ROADMAP.md Phase 2. See pft/bank_sync.py for
    the provider-agnostic contract and pft/bank_sync_gocardless.py /
    bank_sync_simplefin.py for the two shipped providers.

    Every mutating action here is already unreachable on a demo instance:
    DemoModeMiddleware blocks all non-GET requests outside a small allowlist
    that does not include any of these, so bank sync needs no separate demo
    guard - the same \"guarded by construction\" property notifications and
    imports already get for free.

    Args:
        id (str):
        body (PatchedSyncConnection | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        SyncConnection
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
    body: PatchedSyncConnection | Unset = UNSET,
) -> Response[SyncConnection]:
    r"""Bank sync connections - ROADMAP.md Phase 2. See pft/bank_sync.py for
    the provider-agnostic contract and pft/bank_sync_gocardless.py /
    bank_sync_simplefin.py for the two shipped providers.

    Every mutating action here is already unreachable on a demo instance:
    DemoModeMiddleware blocks all non-GET requests outside a small allowlist
    that does not include any of these, so bank sync needs no separate demo
    guard - the same \"guarded by construction\" property notifications and
    imports already get for free.

    Args:
        id (str):
        body (PatchedSyncConnection | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[SyncConnection]
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
    body: PatchedSyncConnection | Unset = UNSET,
) -> SyncConnection | None:
    r"""Bank sync connections - ROADMAP.md Phase 2. See pft/bank_sync.py for
    the provider-agnostic contract and pft/bank_sync_gocardless.py /
    bank_sync_simplefin.py for the two shipped providers.

    Every mutating action here is already unreachable on a demo instance:
    DemoModeMiddleware blocks all non-GET requests outside a small allowlist
    that does not include any of these, so bank sync needs no separate demo
    guard - the same \"guarded by construction\" property notifications and
    imports already get for free.

    Args:
        id (str):
        body (PatchedSyncConnection | Unset):

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
            body=body,
        )
    ).parsed
