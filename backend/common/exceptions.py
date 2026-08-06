from __future__ import annotations

from typing import Any

from rest_framework.response import Response
from rest_framework.views import exception_handler


def _first_error_message(detail: Any) -> str | None:
    if isinstance(detail, str):
        return detail

    if isinstance(detail, dict):
        if "detail" in detail:
            message = _first_error_message(detail["detail"])
            if message:
                return message

        for value in detail.values():
            message = _first_error_message(value)
            if message:
                return message

    if isinstance(detail, (list, tuple)):
        for value in detail:
            message = _first_error_message(value)
            if message:
                return message

    return None


def api_exception_handler(
    exc: Exception,
    context: dict[str, Any],
) -> Response | None:
    response = exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    message = (
        _first_error_message(detail)
        or "The request could not be completed."
    )

    response.data = {
        "error": {
            "status": response.status_code,
            "message": message,
            "details": detail,
        }
    }
    return response