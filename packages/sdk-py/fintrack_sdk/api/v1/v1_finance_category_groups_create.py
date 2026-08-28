from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.category_group import CategoryGroup
from ...types import Response


def _get_kwargs(
    *,
    body: CategoryGroup,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/finance/category-groups/",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> CategoryGroup | None:
    if response.status_code == 201:
        response_201 = CategoryGroup.from_dict(response.json())

        return response_201

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[CategoryGroup]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    body: CategoryGroup,
) -> Response[CategoryGroup]:
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.

    Args:
        body (CategoryGroup):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CategoryGroup]
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
    body: CategoryGroup,
) -> CategoryGroup | None:
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.

    Args:
        body (CategoryGroup):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CategoryGroup
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    body: CategoryGroup,
) -> Response[CategoryGroup]:
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.

    Args:
        body (CategoryGroup):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CategoryGroup]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    body: CategoryGroup,
) -> CategoryGroup | None:
    """Base class for the finance viewsets.

    Enforces authentication and, on unsafe methods, that the target budget
    file admits writes for this user (viewers are read-only). Every subclass
    remains responsible for scoping its own get_queryset() through
    tenancy.budget_file_q - see ARCHITECTURE.md.

    Args:
        body (CategoryGroup):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CategoryGroup
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
