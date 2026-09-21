import asyncio
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from pydantic import SecretStr

from src.backend.app.config import settings
from src.backend.app.services.crag import _grade_with_jev, grade_retrieval_quality, CRAGEvaluationResult


def test_grade_with_jev_success():
    async def _test():
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "model": "jev-latest",
            "answers": {
                "retrieval_grade": {
                    "type": "choice",
                    "choice": "CORRECT",
                    "confidence": 0.94
                }
            }
        }

        chunks = [{"id": 1, "text": "Neither party shall be liable for indirect damages."}]

        with patch.object(settings, "enable_jev_grader", True), \
             patch.object(settings, "typesafe_api_key", SecretStr("test_key_123")), \
             patch.object(settings, "typesafe_base_url", "https://api.typesafe.ai/v1"), \
             patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):

            res = await _grade_with_jev("liability", "limitation of liability", chunks)
            assert res is not None
            assert res.retrieval_grade == "CORRECT"
            assert res.confidence == 0.94
            assert res.relevant_chunk_indices == [0]
            assert "System 1 Jev decision" in res.reasoning

    asyncio.run(_test())


def test_grade_with_jev_incorrect():
    async def _test():
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "model": "jev-latest",
            "answers": {
                "retrieval_grade": {
                    "type": "choice",
                    "choice": "INCORRECT",
                    "confidence": 0.98
                }
            }
        }

        chunks = [{"id": 1, "text": "Unrelated header information"}]

        with patch.object(settings, "enable_jev_grader", True), \
             patch.object(settings, "typesafe_api_key", SecretStr("test_key_123")), \
             patch.object(settings, "typesafe_base_url", "https://api.typesafe.ai/v1"), \
             patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):

            res = await _grade_with_jev("liability", "limitation of liability", chunks)
            assert res is not None
            assert res.retrieval_grade == "INCORRECT"
            assert res.confidence == 0.98
            assert res.relevant_chunk_indices == []

    asyncio.run(_test())


def test_grade_with_jev_fallback_on_error():
    async def _test():
        chunks = [{"id": 1, "text": "Some text"}]

        with patch.object(settings, "enable_jev_grader", True), \
             patch.object(settings, "typesafe_api_key", SecretStr("test_key_123")), \
             patch.object(settings, "typesafe_base_url", "https://api.typesafe.ai/v1"), \
             patch("httpx.AsyncClient.post", side_effect=Exception("Connection timeout")):

            res = await _grade_with_jev("liability", "limitation of liability", chunks)
            assert res is None

    asyncio.run(_test())


def test_grade_with_jev_security_rejects_insecure_url():
    async def _test():
        chunks = [{"id": 1, "text": "Some text"}]

        with patch.object(settings, "enable_jev_grader", True), \
             patch.object(settings, "typesafe_api_key", SecretStr("test_key_123")), \
             patch.object(settings, "typesafe_base_url", "http://evil-external-domain.com/v1"):

            res = await _grade_with_jev("liability", "limitation of liability", chunks)
            assert res is None

    asyncio.run(_test())


def test_grade_retrieval_quality_integration():
    async def _test():
        mock_res = CRAGEvaluationResult(
            rule_name="liability",
            retrieval_grade="CORRECT",
            confidence=0.91,
            relevant_chunk_indices=[0],
            reasoning="Test Jev"
        )

        chunks = [{"id": 1, "text": "Liability clause"}]

        with patch("src.backend.app.services.crag._grade_with_jev", new_callable=AsyncMock, return_value=mock_res):
            out = await grade_retrieval_quality({"name": "liability", "query": "liability cap"}, chunks)
            assert out.retrieval_grade == "CORRECT"
            assert out.confidence == 0.91

    asyncio.run(_test())
