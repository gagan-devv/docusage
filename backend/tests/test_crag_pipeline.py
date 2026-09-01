import pytest
from unittest.mock import AsyncMock, patch
from src.backend.app.services.crag import (
    grade_retrieval_quality,
    filter_and_recompose_chunks,
    sanitize_citations,
    audit_covenant_crag,
    execute_crag_audit_pipeline,
    CRAGEvaluationResult,
    CRAGCitation,
    CRAGFinding,
)


@pytest.mark.anyio
async def test_crag_grader_correct_when_chunks_match():
    rule = {
        "name": "Limitation of Liability Cap",
        "query": "limitation of liability cap aggregate damages",
        "threshold": 0.8
    }
    chunks = [
        {"id": 1, "text": "Section 8.2: The total aggregate liability under this Agreement shall not exceed two times the fees paid."},
        {"id": 2, "text": "Section 8.3: Neither party shall be liable for indirect or punitive damages."}
    ]

    with patch("src.backend.app.services.crag.hf_service.generate_json", new_callable=AsyncMock) as mock_hf:
        mock_hf.return_value = {
            "rule_name": "Limitation of Liability Cap",
            "retrieval_grade": "CORRECT",
            "confidence": 0.94,
            "relevant_chunk_indices": [0],
            "reasoning": "Chunk 0 directly defines the total aggregate liability cap."
        }

        res = await grade_retrieval_quality(rule, chunks)
        assert res.retrieval_grade == "CORRECT"
        assert res.confidence == 0.94
        assert res.relevant_chunk_indices == [0]


@pytest.mark.anyio
async def test_crag_grader_incorrect_when_document_unrelated():
    rule = {
        "name": "Limitation of Liability Cap",
        "query": "limitation of liability cap aggregate damages",
        "threshold": 0.8
    }
    # Unrelated document: permission letter
    chunks = [
        {"id": 1, "text": "Subject: Request for Permission to Use Convention Centre for Decoration and Rehearsal."},
        {"id": 2, "text": "Yours sincerely, Prakhar Srivastava, SAC Cultural Secretary, ABV-IIITM Gwalior."}
    ]

    with patch("src.backend.app.services.crag.hf_service.generate_json", new_callable=AsyncMock) as mock_hf:
        mock_hf.return_value = {
            "rule_name": "Limitation of Liability Cap",
            "retrieval_grade": "INCORRECT",
            "confidence": 0.98,
            "relevant_chunk_indices": [],
            "reasoning": "The chunks belong to an institutional facility permission letter and contain zero liability terms."
        }

        res = await grade_retrieval_quality(rule, chunks)
        assert res.retrieval_grade == "INCORRECT"
        assert res.confidence >= 0.90
        assert res.relevant_chunk_indices == []


def test_crag_filter_and_recompose():
    chunks = [
        {"id": 1, "text": "Noise chunk before agreement"},
        {"id": 2, "text": "Relevant clause: Governing law of Delaware"},
        {"id": 3, "text": "Another noise chunk"}
    ]
    eval_res = CRAGEvaluationResult(
        rule_name="Governing Law",
        retrieval_grade="CORRECT",
        confidence=0.92,
        relevant_chunk_indices=[1],
        reasoning="Only chunk 1 contains governing law"
    )

    filtered = filter_and_recompose_chunks(chunks, eval_res)
    assert len(filtered) == 1
    assert filtered[0]["id"] == 2


def test_sanitize_citations_verbatim_grounding():
    chunks = [
        {"id": 10, "text": "The aggregate liability under this agreement shall be uncapped for data breaches and willful misconduct."}
    ]
    raw_citations = [
        {
            "chunk_id": 10,
            "chunk_index": 0,
            "exact_quote": "uncapped for data breaches",
            "section_reference": "Section 8.2",
            "relevance_score": 0.95
        },
        {
            "chunk_id": 10,
            "chunk_index": 0,
            "exact_quote": "THIS PHRASE DOES NOT EXIST IN DOCUMENT",
            "section_reference": "Section Fake",
            "relevance_score": 0.95
        }
    ]

    verified = sanitize_citations(raw_citations, chunks)
    assert len(verified) == 1
    assert verified[0].exact_quote == "uncapped for data breaches"


@pytest.mark.anyio
async def test_crag_audit_missing_covenant_zero_fake_citations():
    rule = {"name": "Governing Law (New York)", "query": "governing law jurisdiction New York"}
    chunks = [{"id": 1, "text": "Permission request for teachers day decoration"}]
    eval_res = CRAGEvaluationResult(
        rule_name="Governing Law (New York)",
        retrieval_grade="INCORRECT",
        confidence=0.98,
        relevant_chunk_indices=[],
        reasoning="No governing law clauses exist"
    )

    finding = await audit_covenant_crag(
        rule=rule,
        chunks=chunks,
        eval_result=eval_res,
        contract_metadata={"name": "Permission_Letter.pdf"}
    )

    assert finding.status == "MISSING_COVENANT"
    assert finding.retrieval_grade == "INCORRECT"
    assert len(finding.citations) == 0
    assert "No 'Governing Law (New York)' covenants were found" in finding.rationale


@pytest.mark.anyio
async def test_crag_execution_pipeline_full_lifecycle():
    rules = [
        {"name": "Limitation of Liability Cap", "query": "limitation of liability cap"},
        {"name": "Governing Law (New York)", "query": "governing law jurisdiction"}
    ]
    candidate_chunks = {
        "Limitation of Liability Cap": [
            {"id": 1, "text": "The total aggregate liability under this Agreement shall be uncapped for data breaches."}
        ],
        "Governing Law (New York)": [
            {"id": 2, "text": "This Agreement shall be governed by the laws of the State of New York."}
        ]
    }

    with patch("src.backend.app.services.crag.hf_service.generate_json", new_callable=AsyncMock) as mock_hf:
        def mock_llm_side_effect(system_prompt, user_prompt, *args, **kwargs):
            if "Retrieval Grader" in system_prompt:
                return {
                    "rule_name": "Test Rule",
                    "retrieval_grade": "CORRECT",
                    "confidence": 0.95,
                    "relevant_chunk_indices": [0],
                    "reasoning": "Valid relevant chunk"
                }
            elif "Auditor" in system_prompt:
                if "uncapped" in user_prompt:
                    return {
                        "rule_name": "Limitation of Liability Cap",
                        "status": "DEVIATION",
                        "confidence_score": 0.92,
                        "retrieval_grade": "CORRECT",
                        "citations": [
                            {
                                "chunk_id": 1,
                                "chunk_index": 0,
                                "exact_quote": "uncapped for data breaches",
                                "section_reference": "Section 8.2",
                                "relevance_score": 0.94
                            }
                        ],
                        "rationale": "Uncapped liability for data breaches violates policy.",
                        "suggested_redline": "Limit liability to 2x annual contract fees."
                    }
                else:
                    return {
                        "rule_name": "Governing Law (New York)",
                        "status": "SATISFIED",
                        "confidence_score": 0.96,
                        "retrieval_grade": "CORRECT",
                        "citations": [
                            {
                                "chunk_id": 2,
                                "chunk_index": 0,
                                "exact_quote": "governed by the laws of the State of New York",
                                "section_reference": "Section 14.1",
                                "relevance_score": 0.98
                            }
                        ],
                        "rationale": "Governing law is New York.",
                        "suggested_redline": None
                    }
            return {}

        mock_hf.side_effect = mock_llm_side_effect

        findings = await execute_crag_audit_pipeline(rules, candidate_chunks)
        assert len(findings) == 2
        assert findings[0].status == "DEVIATION"
        assert len(findings[0].citations) == 1
        assert findings[0].citations[0].exact_quote == "uncapped for data breaches"
        assert findings[1].status == "SATISFIED"
        assert findings[1].citations[0].exact_quote == "governed by the laws of the State of New York"


@pytest.mark.anyio
async def test_classify_contract_type_institutional_mou():
    from src.backend.app.services.crag import classify_contract_type

    sample_text = (
        "MEMORANDUM OF UNDERSTANDING\n"
        "This Memorandum of Understanding is entered into by and between ABV-IIITM Gwalior "
        "and Choke The Band for artist performance at Mridang 2026."
    )
    available_policies = [
        {"id": 1, "name": "Corporate Commercial MSA Policy", "rules": []},
        {"id": 2, "name": "Institutional MoU & Event Policy", "rules": []},
        {"id": 3, "name": "Budget & Financial Allocation Policy", "rules": []},
    ]

    with patch("src.backend.app.services.crag.hf_service.generate_json", new_callable=AsyncMock) as mock_hf:
        mock_hf.return_value = {
            "document_type": "Institutional MoU",
            "recommended_policy_id": 2,
            "confidence": 0.95,
            "summary": "Memorandum of Understanding for institutional artist performance."
        }

        res = await classify_contract_type(sample_text, available_policies)
        assert res["document_type"] == "Institutional MoU"
        assert res["recommended_policy_id"] == 2
        assert res["confidence"] >= 0.90


@pytest.mark.anyio
async def test_refine_findings_with_counsel_waivers():
    from src.backend.app.services.crag import refine_findings_with_feedback

    findings = [
        CRAGFinding(
            rule_name="Governing Law (New York)",
            status="DEVIATION",
            confidence_score=0.92,
            retrieval_grade="CORRECT",
            citations=[
                CRAGCitation(
                    chunk_id=1,
                    chunk_index=0,
                    exact_quote="courts in Gwalior shall have exclusive jurisdiction",
                    section_reference="Section 7"
                )
            ],
            rationale="Agreement specifies Gwalior jurisdiction instead of New York.",
            suggested_redline="Change to New York."
        )
    ]

    feedback = "Waive New York governing law requirement. Accept Gwalior jurisdiction for this event."

    with patch("src.backend.app.services.crag.hf_service.generate_json", new_callable=AsyncMock) as mock_hf:
        mock_hf.return_value = {
            "refined_findings": [
                {
                    "rule_name": "Governing Law (New York)",
                    "status": "WAIVED_BY_COUNSEL",
                    "confidence_score": 0.95,
                    "retrieval_grade": "CORRECT",
                    "rationale": "Jurisdiction in Gwalior explicitly waived and approved by legal counsel for this local event.",
                    "suggested_redline": None
                }
            ],
            "recalculated_risk_score": 0.0,
            "counsel_notes": "Gwalior jurisdiction accepted per counsel instruction."
        }

        res = await refine_findings_with_feedback(feedback, findings, "CTB_MoU.pdf")
        assert len(res["findings"]) == 1
        assert res["findings"][0].status == "WAIVED_BY_COUNSEL"
        assert res["risk_score"] == 0.0
        assert len(res["findings"][0].citations) == 1
        assert res["findings"][0].citations[0].exact_quote == "courts in Gwalior shall have exclusive jurisdiction"


def test_hierarchical_chunk_document_detects_sections():
    from src.backend.app.utils.helpers import hierarchical_chunk_document

    sample_doc = (
        "MEMORANDUM OF UNDERSTANDING\n\n"
        "1. DEFINITIONS\n"
        "Agreement means this document.\n\n"
        "7. TERMS OF AGREEMENT\n"
        "7.1 The Institution shall disburse 70% advance payment.\n"
        "7.2 All disputes shall be settled in Gwalior courts.\n\n"
        "SCHEDULE A - PRICING\n"
        "Total Fee: Rs. 1,00,000"
    )

    chunks = hierarchical_chunk_document(sample_doc, max_chunk_size=300)
    assert len(chunks) >= 3
    section_headers = [c["section_header"] for c in chunks]
    assert any("7. TERMS OF AGREEMENT" in h for h in section_headers)
    assert any("1. DEFINITIONS" in h for h in section_headers)
    assert any("SCHEDULE A" in h for h in section_headers)


def test_compute_bm25_sparse_scores_numeric_boosting():
    from src.backend.app.services.rag import compute_bm25_sparse_scores

    chunks = [
        {"id": 1, "text": "We request a general budget allocation for events."},
        {"id": 2, "text": "We request 70% of the amount to be released in advance."},
        {"id": 3, "text": "The total fee is $50,000 for production."},
    ]

    scores_70 = compute_bm25_sparse_scores("advance payment cap 70%", chunks)
    assert scores_70[1] > scores_70[0]
    assert scores_70[1] > scores_70[2]

    scores_50k = compute_bm25_sparse_scores("production fee $50,000", chunks)
    assert scores_50k[2] > scores_50k[0]


@pytest.mark.anyio
async def test_execute_crag_audit_pipeline_concurrent():
    rules = [
        {"name": "Rule 1", "query": "q1", "threshold": 0.5},
        {"name": "Rule 2", "query": "q2", "threshold": 0.5},
        {"name": "Rule 3", "query": "q3", "threshold": 0.5},
    ]
    candidate_chunks = {
        "Rule 1": [{"id": 1, "text": "Clause 1"}],
        "Rule 2": [{"id": 2, "text": "Clause 2"}],
        "Rule 3": [{"id": 3, "text": "Clause 3"}],
    }

    with patch("src.backend.app.services.crag.grade_retrieval_quality", new_callable=AsyncMock) as mock_grade, \
         patch("src.backend.app.services.crag.audit_covenant_crag", new_callable=AsyncMock) as mock_audit:

        mock_grade.return_value = CRAGEvaluationResult(
            rule_name="Mock", retrieval_grade="CORRECT", confidence=0.95, relevant_chunk_indices=[0]
        )
        mock_audit.return_value = CRAGFinding(
            rule_name="Mock", status="SATISFIED", confidence_score=0.95, citations=[], rationale="Mock covenant satisfied"
        )

        findings = await execute_crag_audit_pipeline(rules, candidate_chunks, concurrency_limit=3)
        assert len(findings) == 3
        assert mock_grade.call_count == 3
        assert mock_audit.call_count == 3


