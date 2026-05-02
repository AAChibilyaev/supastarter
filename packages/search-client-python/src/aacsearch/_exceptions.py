"""Custom exceptions for the AACSearch SDK."""

from typing import Optional


class AacsearchError(Exception):
    """Base exception for all AACSearch SDK errors."""

    def __init__(self, message: str, status_code: Optional[int] = None, body: Optional[dict] = None) -> None:
        self.status_code = status_code
        self.body = body or {}
        super().__init__(message)


class AuthenticationError(AacsearchError):
    """Raised when the API key is missing, invalid, or expired."""


class NotFoundError(AacsearchError):
    """Raised when the requested resource does not exist."""


class RateLimitError(AacsearchError):
    """Raised when the API rate limit has been exceeded."""


def _raise_for_status(response: "httpx.Response") -> None:
    """Map HTTP status codes to SDK exceptions."""
    from httpx import HTTPStatusError

    if response.status_code < 400:
        return

    try:
        body = response.json()
    except Exception:
        body = {}

    message = body.get("message", body.get("error", response.reason_phrase or "Unknown error"))

    if response.status_code == 401:
        raise AuthenticationError(message, response.status_code, body)
    if response.status_code == 403:
        raise AuthenticationError(message, response.status_code, body)
    if response.status_code == 404:
        raise NotFoundError(message, response.status_code, body)
    if response.status_code == 429:
        raise RateLimitError(message, response.status_code, body)

    raise AacsearchError(message, response.status_code, body)
