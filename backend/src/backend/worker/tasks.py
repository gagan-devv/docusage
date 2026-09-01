import json
import logging
from typing import Any
from src.backend.worker.celery_app import celery_app
from src.backend.app.utils.file_processing import read_document_pages
from src.backend.app.utils.helpers import hierarchical_chunk_document
from src.backend.app.services.rag import generate_embeddings
from src.backend.app.utils.db import get_db_connection, release_db_connection

logger = logging.getLogger("docusage.worker")

def ingest_contract(contract_id: Any, file_path: str) -> int:
    """Extract page text, perform hierarchical semantic chunking, embed, and store in DB."""
    try:
        pages = read_document_pages(file_path)
    except Exception as e:
        logger.error(f"Failed to read document pages from {file_path}: {e}")
        return 0

    structured_chunks = []
    for page in pages:
        page_num = page.get("page_number", 1)
        page_text = page.get("text", "")
        if not page_text.strip():
            continue
        page_chunks = hierarchical_chunk_document(page_text, max_chunk_size=512)
        for chk in page_chunks:
            chk["page_number"] = page_num
            chk["entities"] = {
                "page_number": page_num,
                "section_header": chk.get("section_header", "Document"),
            }
            structured_chunks.append(chk)

    if not structured_chunks:
        return 0

    chunk_texts = [c["text"] for c in structured_chunks]
    embeddings = generate_embeddings(chunk_texts)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        for chk_obj, emb in zip(structured_chunks, embeddings):
            cursor.execute(
                """
                INSERT INTO clauses (contract_id, text, clause_type, entities, embedding)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    str(contract_id),
                    chk_obj["text"],
                    chk_obj.get("clause_type", "Clause"),
                    json.dumps(chk_obj.get("entities", {})),
                    str(emb)
                )
            )
        conn.commit()
        cursor.close()
        return len(structured_chunks)
    finally:
        release_db_connection(conn)

@celery_app.task
def ingest_contract_task(contract_id: Any, file_path: str) -> int:
    return ingest_contract(contract_id, file_path)
