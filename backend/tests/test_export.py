import pytest
from unittest.mock import patch, AsyncMock
from src.backend.app.services.export import generate_audit_json_data, generate_audit_pdf_bytes

@pytest.mark.anyio
async def test_generate_audit_json_data():
    with patch("src.backend.app.services.export.get_contract", new_callable=AsyncMock) as mock_contract, \
         patch("src.backend.app.services.export.get_policy", new_callable=AsyncMock) as mock_policy, \
         patch("src.backend.app.services.export.get_contract_clauses_list", new_callable=AsyncMock) as mock_clauses, \
         patch("src.backend.app.services.export.execute_crag_audit_pipeline", new_callable=AsyncMock) as mock_crag:

        mock_contract.return_value = None
        mock_policy.return_value = None
        mock_clauses.return_value = [{"id": 1, "text": "Limitation of liability aggregate cap 2x fees."}]

        from src.backend.app.services.crag import CRAGFinding, CRAGCitation
        mock_crag.return_value = [
            CRAGFinding(
                rule_name="Limitation of Liability Cap",
                status="SATISFIED",
                confidence_score=0.95,
                retrieval_grade="CORRECT",
                citations=[
                    CRAGCitation(chunk_id=1, chunk_index=0, exact_quote="Limitation of liability aggregate cap 2x fees.", section_reference="Page 1")
                ],
                rationale="Clause satisfies cap requirement."
            )
        ]

        data = await generate_audit_json_data("test-contract-123", policy_id=1)
        assert data["contract"]["id"] == "test-contract-123"
        assert data["compliance_summary"]["covenants_satisfied"] == 1
        assert data["compliance_summary"]["overall_risk_score"] == 0.0
        assert len(data["findings"]) == 1
        assert data["findings"][0]["citations"][0]["exact_quote"] == "Limitation of liability aggregate cap 2x fees."


@pytest.mark.anyio
async def test_generate_audit_pdf_bytes():
    with patch("src.backend.app.services.export.get_contract", new_callable=AsyncMock) as mock_contract, \
         patch("src.backend.app.services.export.get_policy", new_callable=AsyncMock) as mock_policy, \
         patch("src.backend.app.services.export.get_contract_clauses_list", new_callable=AsyncMock) as mock_clauses, \
         patch("src.backend.app.services.export.execute_crag_audit_pipeline", new_callable=AsyncMock) as mock_crag:

        mock_contract.return_value = None
        mock_policy.return_value = None
        mock_clauses.return_value = []
        mock_crag.return_value = []

        pdf_bytes = await generate_audit_pdf_bytes("test-contract-123", policy_id=1)
        assert pdf_bytes.startswith(b"%PDF-")
        assert len(pdf_bytes) > 500


@pytest.mark.anyio
async def test_generate_audit_pdf_bytes_with_xml_injection():
    """Verify that malicious XML/HTML markup in document names, findings, or quotes is safely escaped."""
    from src.backend.app.models.contracts import ContractResponse
    from src.backend.app.services.crag import CRAGFinding, CRAGCitation
    from datetime import datetime, timezone

    malicious_contract = ContractResponse(
        id=1,
        name="Contract <script>alert('xss')</script> & <evil_tag>",
        file_path="data/contracts/test.pdf",
        metadata={},
        created_at=datetime.now(timezone.utc)
    )

    with patch("src.backend.app.services.export.get_contract", new_callable=AsyncMock) as mock_contract, \
         patch("src.backend.app.services.export.get_policy", new_callable=AsyncMock) as mock_policy, \
         patch("src.backend.app.services.export.get_contract_clauses_list", new_callable=AsyncMock) as mock_clauses, \
         patch("src.backend.app.services.export.execute_crag_audit_pipeline", new_callable=AsyncMock) as mock_crag:

        mock_contract.return_value = malicious_contract
        mock_policy.return_value = None
        mock_clauses.return_value = []
        mock_crag.return_value = [
            CRAGFinding(
                rule_name="<font color='red'>Malicious Rule & Injection</font>",
                status="DEVIATION",
                confidence_score=0.99,
                retrieval_grade="CORRECT",
                citations=[
                    CRAGCitation(
                        chunk_id=1,
                        chunk_index=0,
                        exact_quote="<unclosed_tag> This is text with < & > and \"quotes\"",
                        section_reference="<Section & 1>"
                    )
                ],
                rationale="Rationale with <b unclosed and & entities",
                suggested_redline="<b>Delete</b> this & replace with <script>evil()</script>"
            )
        ]

        # Must not raise ReportLab XML parsing errors
        pdf_bytes = await generate_audit_pdf_bytes("test-injection-uuid", policy_id=1)
        assert pdf_bytes.startswith(b"%PDF-")
        assert len(pdf_bytes) > 500

