"""Internal HTTP transport for the AACSearch SDK."""

from __future__ import annotations

from typing import Any

import httpx

from ._exceptions import _raise_for_status

DEFAULT_TIMEOUT = 30.0  # seconds


def _request(
    base_url: str,
    api_key: str,
    method: str,
    path: str,
    body: Any = None,
    params: dict[str, str] | None = None,
    timeout: float = DEFAULT_TIMEOUT,
) -> Any:
    """Make an authenticated HTTP request to the AACSearch v1 REST API."""
    url = f"{base_url.rstrip('/')}{path}"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "aacsearch-python-sdk/0.1.0",
    }

    json_data: Any = None
    if body is not None:
        json_data = body

    with httpx.Client(timeout=timeout) as client:
        response = client.request(
            method=method,
            url=url,
            headers=headers,
            json=json_data,
            params=params,
        )

    _raise_for_status(response)

    if response.status_code == 204:
        return None

    return response.json()
