"""
AACsearch Python SDK — search-as-a-service client.

Usage:
    from aacsearch import SearchClient

    client = SearchClient(
        base_url="https://app.aacsearch.com",
        api_key="ss_search_...",
        index_slug="products",
    )
    results = client.search(q="laptop")
"""

from ._search_client import SearchClient
from ._admin_client import AdminClient
from ._exceptions import AacsearchError, AuthenticationError, NotFoundError, RateLimitError

__all__ = [
    "SearchClient",
    "AdminClient",
    "AacsearchError",
    "AuthenticationError",
    "NotFoundError",
    "RateLimitError",
]
