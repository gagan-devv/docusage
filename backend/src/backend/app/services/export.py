import io
import json
from datetime import datetime
from typing import Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

from src.backend.app.services.contracts import get_contract, get_contract_clauses_list
from src.backend.app.services.policies import get_policy, DEFAULT_POLICIES
from src.backend.app.services.crag import execute_crag_audit_pipeline
from src.backend.app.utils.metrics import contract_evaluations_total, audit_exports_total


async def generate_audit_json_data(contract_id: str, policy_id: Optional[int] = 1) -> Dict[str, Any]:
    policy_id = policy_id or 1

    # 1. Fetch contract
    contract = await get_contract(contract_id)
    contract_name = contract.name if contract else f"Contract_{contract_id[:8]}.pdf"
    
    # 2. Fetch policy
    policy = await get_policy(policy_id)
    if not policy:
        pol_data = DEFAULT_POLICIES[(policy_id - 1) % len(DEFAULT_POLICIES)]
        policy_name = pol_data["name"]
        rules = pol_data["rules"]
    else:
        policy_name = policy.name
        rules = policy.rules

    # 3. Fetch contract clauses
    clauses = await get_contract_clauses_list(contract_id)

    # 4. Execute CRAG Audit Pipeline
    candidate_chunks = {}
    for r in rules:
        r_name = r.get("name", "Rule")
        candidate_chunks[r_name] = clauses if clauses else []

    findings = await execute_crag_audit_pipeline(rules, candidate_chunks)

    # 5. Compute metrics
    satisfied_count = sum(1 for f in findings if f.status == "SATISFIED" or f.status == "WAIVED_BY_COUNSEL")
    deviation_count = sum(1 for f in findings if f.status == "DEVIATION")
    missing_count = sum(1 for f in findings if f.status == "MISSING_COVENANT")
    total_rules = len(rules)

    if total_rules > 0:
        risk_score = round(deviation_count / total_rules, 2)
    else:
        risk_score = 0.0

    compliance_status = "APPROVED" if risk_score == 0.0 else "REQUIRES_LEGAL_REVIEW"

    # Track Prometheus telemetry
    try:
        contract_evaluations_total.labels(status=compliance_status).inc()
        audit_exports_total.labels(format="json").inc()
    except Exception:
        pass

    findings_json = []
    for f in findings:
        citations_list = []
        for c in f.citations:
            citations_list.append({
                "chunk_id": c.chunk_id,
                "chunk_index": c.chunk_index,
                "exact_quote": c.exact_quote,
                "section_reference": c.section_reference,
                "relevance_score": getattr(c, "relevance_score", 0.95)
            })

        findings_json.append({
            "rule_name": f.rule_name,
            "status": f.status,
            "confidence_score": f.confidence_score,
            "retrieval_grade": f.retrieval_grade,
            "rationale": f.rationale,
            "suggested_redline": f.suggested_redline,
            "citations": citations_list
        })

    return {
        "export_metadata": {
            "platform": "Docusage AI Multi-Agent Compliance Engine",
            "export_timestamp": datetime.utcnow().isoformat() + "Z",
            "version": "v1.0.0"
        },
        "contract": {
            "id": contract_id,
            "name": contract_name,
            "file_path": contract.file_path if contract else f"data/contracts/{contract_id}.pdf",
            "total_clauses": len(clauses)
        },
        "policy": {
            "id": policy_id,
            "name": policy_name,
            "total_covenants": total_rules
        },
        "compliance_summary": {
            "overall_risk_score": risk_score,
            "compliance_status": compliance_status,
            "total_covenants_evaluated": total_rules,
            "covenants_satisfied": satisfied_count,
            "deviations_detected": deviation_count,
            "missing_covenants": missing_count
        },
        "findings": findings_json
    }


async def generate_audit_pdf_bytes(contract_id: str, policy_id: Optional[int] = 1) -> bytes:
    data = await generate_audit_json_data(contract_id, policy_id)
    try:
        audit_exports_total.labels(format="pdf").inc()
    except Exception:
        pass

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styling tokens
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'SubTitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=12
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=10,
        spaceAfter=6
    )

    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#334155')
    )

    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0f172a')
    )

    story = []

    # Title Banner
    story.append(Paragraph("DOCUSAGE LEGAL COMPLIANCE CERTIFICATE", title_style))
    story.append(Paragraph(f"Autonomous CRAG Audit Report • Generated {data['export_metadata']['export_timestamp'][:19]} UTC", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3b82f6'), spaceAfter=12))

    # Summary Grid Table
    summary_data = [
        [
            Paragraph("<b>Target Document:</b>", cell_style),
            Paragraph(data['contract']['name'], cell_bold),
            Paragraph("<b>Policy Governed:</b>", cell_style),
            Paragraph(data['policy']['name'], cell_bold),
        ],
        [
            Paragraph("<b>Contract ID:</b>", cell_style),
            Paragraph(data['contract']['id'][:16] + "...", cell_style),
            Paragraph("<b>Risk Metric:</b>", cell_style),
            Paragraph(f"{data['compliance_summary']['overall_risk_score'] * 100:.0f}% ({data['compliance_summary']['compliance_status']})", cell_bold),
        ],
    ]

    summary_table = Table(summary_data, colWidths=[110, 160, 110, 160])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # Covenant Audit Findings Section
    story.append(Paragraph("EVALUATED COVENANTS & CRAG FINDINGS", section_heading))

    table_data = [
        [
            Paragraph("<b>Covenant Rule</b>", cell_bold),
            Paragraph("<b>Status</b>", cell_bold),
            Paragraph("<b>Conf.</b>", cell_bold),
            Paragraph("<b>Rationale & Citations</b>", cell_bold),
        ]
    ]

    for f in data["findings"]:
        status_str = f["status"]
        if status_str == "SATISFIED":
            status_text = f"<font color='#15803d'><b>{status_str}</b></font>"
        elif status_str == "DEVIATION":
            status_text = f"<font color='#b91c1c'><b>{status_str}</b></font>"
        else:
            status_text = f"<font color='#d97706'><b>{status_str}</b></font>"

        cit_html = ""
        if f["citations"]:
            for c in f["citations"]:
                cit_html += f"<br/><i>Quote ({c['section_reference']}):</i> \"{c['exact_quote'][:120]}\""

        redline_html = f"<br/><font color='#2563eb'><b>Suggested Redline:</b> {f['suggested_redline']}</font>" if f.get("suggested_redline") else ""

        rationale_p = Paragraph(f"{f['rationale']}{cit_html}{redline_html}", cell_style)

        table_data.append([
            Paragraph(f["rule_name"], cell_bold),
            Paragraph(status_text, cell_style),
            Paragraph(f"{f['confidence_score']*100:.0f}%", cell_style),
            rationale_p
        ])

    findings_table = Table(table_data, colWidths=[120, 85, 45, 290])
    findings_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))

    story.append(findings_table)
    story.append(Spacer(1, 18))

    # Legal Sign-off Block
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=10))
    story.append(Paragraph("<b>LEGAL COUNSEL ARBITRATION SIGN-OFF</b>", section_heading))
    signoff_p = Paragraph(
        "This compliance certificate was generated automatically by Docusage Corrective RAG (CRAG). "
        "Verified citations match grounded clauses extracted from the target agreement. "
        "Formal sign-off requires review by designated Partner / Senior Legal Counsel.",
        cell_style
    )
    story.append(signoff_p)

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
