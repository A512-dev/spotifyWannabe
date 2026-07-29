from __future__ import annotations

from typing import Any

from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    response = exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    message = "The request could not be completed."

    if isinstance(detail, dict) and "detail" in detail:
        message = str(detail["detail"])
    elif isinstance(detail, list) and detail:
        message = str(detail[0])
    elif isinstance(detail, str):
        message = detail

    response.data = {
        "error": {
            "status": response.status_code,
            "message": message,
            "details": detail,
        }
    }
    return response
