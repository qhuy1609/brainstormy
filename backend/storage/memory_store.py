"""
In-memory session storage.

For deployment, replace this dictionary with a database such as SQLite,
PostgreSQL, or Redis while keeping the same store[session_id] interface.
"""

store = {}
