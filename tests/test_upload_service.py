"""Upload service tests (size gate + CSV parse errors)."""

from __future__ import annotations

import asyncio
from io import BytesIO
from unittest.mock import MagicMock

import pytest
from starlette.datastructures import UploadFile

from sentiment_app.exceptions import PayloadTooLargeError, ValidationError
from sentiment_app.services import upload_service as up
from sentiment_app.settings import get_settings


def test_rejects_oversized_when_size_reported(
    workspace_tmp, monkeypatch: pytest.MonkeyPatch
) -> None:
    paths = get_settings().paths()

    class _S:
        def max_upload_bytes(self) -> int:
            return 10

        def paths(self):
            return paths

    monkeypatch.setattr(up, "get_settings", lambda: _S())

    a = MagicMock()
    a.size = 99999
    a.file = BytesIO(b"x")
    b = MagicMock()
    b.size = 1
    b.file = BytesIO(b"y")

    async def _go() -> None:
        with pytest.raises(PayloadTooLargeError):
            await up.store_two_datasets(a, b)

    asyncio.run(_go())


def test_validation_on_unparseable_csv(workspace_tmp) -> None:
    bad = UploadFile(
        filename="bad.csv",
        file=BytesIO(b"\xff\xfe{{{not valid csv for pandas"),
    )
    good = UploadFile(filename="g.csv", file=BytesIO(b"x,y\n1,2\n"))

    async def _go() -> None:
        with pytest.raises(ValidationError):
            await up.store_two_datasets(bad, good)

    asyncio.run(_go())


def test_single_file_upload_parses(workspace_tmp) -> None:
    buf = BytesIO(b"text,label\nhello,pos\n")
    csv_a = UploadFile(filename="a.csv", file=buf)

    async def _go():
        return await up.store_datasets(csv_a, None)

    out = asyncio.run(_go())
    assert out["upload_mode"] == "single"
    assert out["rows_a"] == 1
    assert out["rows_b"] == 0
    assert "text" in out["columns_a"]

