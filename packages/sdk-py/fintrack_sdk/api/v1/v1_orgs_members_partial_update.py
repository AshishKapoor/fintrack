from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.organization import Organization
from ...models.patched_organization import PatchedOrganization
from ...types import UNSET, Response, Unset


def _get_kwargs(
    id: str,
    membership_id: str,
    *,
    body: PatchedOrganization | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/orgs/{id}/members/{membership_id}/".format(
            id=quote(str(id), safe=""),
            membership_id=quote(str(membership_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Organization | None:
    if response.status_code == 200:
        response_200 = Organization.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Organization]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    id: str,
    membership_id: str,
    *,
    client: AuthenticatedClient,
    body: PatchedOrganization | Unset = UNSET,
) -> Response[Organization]:
    """
    Args:
        id (str):
        membership_id (str):
        body (PatchedOrganization | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Organization]
    """

    kwargs = _get_kwargs(
        id=id,
        membership_id=membership_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    id: str,
    membership_id: str,
    *,
    client: AuthenticatedClient,
    body: PatchedOrganization | Unset = UNSET,
) -> Organization | None:
    """
    Args:
        id (str):
        membership_id (str):
        body (PatchedOrganization | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Organization
    """

    return sync_detailed(
        id=id,
        membership_id=membership_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    id: str,
    membership_id: str,
    *,
    client: AuthenticatedClient,
    body: PatchedOrganization | Unset = UNSET,
) -> Response[Organization]:
    """
    Args:
        id (str):
        membership_id (str):
        body (PatchedOrganization | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Organization]
    """

    kwargs = _get_kwargs(
        id=id,
        membership_id=membership_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    id: str,
    membership_id: str,
    *,
    client: AuthenticatedClient,
    body: PatchedOrganization | Unset = UNSET,
) -> Organization | None:
    """
    Args:
        id (str):
        membership_id (str):
        body (PatchedOrganization | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Organization
    """

    return (
        await asyncio_detailed(
            id=id,
            membership_id=membership_id,
            client=client,
            body=body,
        )
    ).parsed
