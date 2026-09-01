from typing import List, Dict, Any
import re

def clean_text(text: str) -> str:
    """Clean and normalize text (strip non-word chars, collapse whitespace, strip boundaries)."""
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def validate_contract_metadata(metadata: Dict[str, Any]) -> bool:
    """Validate contract metadata."""
    required_keys = ["name", "file_path"]
    return all(key in metadata for key in required_keys)

def chunk_text(text: str, chunk_size: int = 512) -> List[str]:
    """Split text into chunks of a specified size."""
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]


def hierarchical_chunk_document(
    text: str,
    max_chunk_size: int = 512,
    overlap: int = 64
) -> List[Dict[str, Any]]:
    """
    Structure-aware legal chunker that detects section headers, clause numbers,
    and paragraph boundaries while preserving section breadcrumbs.
    """
    if not text or not text.strip():
        return []

    section_header_pattern = re.compile(
        r'(?:^(?:SECTION|ARTICLE|CLAUSE|SCHEDULE|ANNEXURE)\s+[A-Za-z0-9IVXLCDM]+(?:\.[0-9]+)*[^\n]*|^[0-9]{1,2}\.\s+[A-Z][^\n]*)',
        re.IGNORECASE | re.MULTILINE
    )

    lines = text.splitlines()
    current_section = "Preamble"
    current_clause_type = "Header / Preamble"
    
    sections = []
    current_buffer = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_buffer:
                current_buffer.append("")
            continue
            
        header_match = section_header_pattern.match(stripped)
        if header_match:
            if current_buffer:
                section_text = "\n".join(current_buffer).strip()
                if section_text:
                    sections.append({
                        "section_header": current_section,
                        "clause_type": current_clause_type,
                        "text": section_text
                    })
                current_buffer = []
            current_section = stripped
            current_clause_type = "Section Header"
        
        current_buffer.append(stripped)
        if current_clause_type == "Section Header" and len(current_buffer) > 1:
            current_clause_type = "Clause"

    if current_buffer:
        section_text = "\n".join(current_buffer).strip()
        if section_text:
            sections.append({
                "section_header": current_section,
                "clause_type": current_clause_type,
                "text": section_text
            })

    chunks: List[Dict[str, Any]] = []
    for sec in sections:
        sec_text = sec["text"]
        sec_header = sec["section_header"]
        sec_type = sec["clause_type"]

        if len(sec_text) <= max_chunk_size:
            chunks.append({
                "text": sec_text,
                "clause_type": sec_type,
                "section_header": sec_header,
            })
        else:
            paragraphs = sec_text.split("\n\n")
            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue
                if len(para) <= max_chunk_size:
                    chunks.append({
                        "text": para,
                        "clause_type": "Paragraph",
                        "section_header": sec_header,
                    })
                else:
                    sentences = re.split(r'(?<=[.!?])\s+', para)
                    sub_buf = []
                    sub_len = 0
                    for s in sentences:
                        s_strip = s.strip()
                        if not s_strip:
                            continue
                        if sub_len + len(s_strip) + 1 > max_chunk_size and sub_buf:
                            chunks.append({
                                "text": " ".join(sub_buf),
                                "clause_type": "Sub-clause",
                                "section_header": sec_header,
                            })
                            sub_buf = [s_strip]
                            sub_len = len(s_strip)
                        else:
                            sub_buf.append(s_strip)
                            sub_len += len(s_strip) + 1
                    if sub_buf:
                        chunks.append({
                            "text": " ".join(sub_buf),
                            "clause_type": "Sub-clause",
                            "section_header": sec_header,
                        })

    return chunks if chunks else [{"text": text, "clause_type": "General", "section_header": "Document"}]