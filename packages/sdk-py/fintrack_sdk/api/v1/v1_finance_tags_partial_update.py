from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.patched_tag import PatchedTag
from ...models.tag import Tag
from ...types import UNSET, Response, Unset


def _get_kwargs(
    id: str,
    *,
    body: PatchedTag | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/finance/tags/{id}/".format(
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
) -> Tag | None:
    if response.status_code == 200:
        response_200 = Tag.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Tag]:
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
    body: PatchedTag | Unset = UNSET,
) -> Response[Tag]:
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.

    Args:
        id (str):
        body (PatchedTag | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Tag]
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
    body: PatchedTag | Unset = UNSET,
) -> Tag | None:
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.

    Args:
        id (str):
        body (PatchedTag | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Tag
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
    body: PatchedTag | Unset = UNSET,
) -> Response[Tag]:
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.

    Args:
        id (str):
        body (PatchedTag | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Tag]
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
    body: PatchedTag | Unset = UNSET,
) -> Tag | None:
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.

    Args:
        id (str):
        body (PatchedTag | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Tag
    """

    return (
        await asyncio_detailed(
            id=id,
            client=client,
            body=body,
        )
    ).parsed
