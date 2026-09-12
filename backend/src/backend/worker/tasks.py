import json
import logging
from typing import Any
from src.backend.worker.celery_app import celery_app
from src.backend.app.utils.file_processing import read_document_pages
from src.backend.app.utils.helpers import hierarchical_chunk_document
from src.backend.app.services.rag import generate_embeddings
from src.backend.app.utils.db import get_db_connection, release_db_connection

logger = logging.getLogger("docusage.worker")

def ingest_contract_with_parents(contract_id: Any, file_path: str) -> int:
    """
    Updated ingestion with parent-child hierarchy.
    - Stores parent documents (sections) in parent_documents table
    - Stores child chunks (clauses) in clauses table with parent references
    """
    try:
        pages = read_document_pages(file_path)
    except Exception as e:
        logger.error(f"Failed to read document pages from {file_path}: {e}")
        return 0

    parent_documents = []
    child_chunks = []

    for page in pages:
        page_num = page.get("page_number", 1)
        page_text = page.get("text", "")
        if not page_text.strip():
            continue

        page_chunks = hierarchical_chunk_document(page_text, max_chunk_size=512)

        for chk in page_chunks:
            entities = {
                "page_number": page_num,
                "section_header": chk.get("section_header", "Document"),
                "clause_type": chk.get("clause_type", "Clause")
            }

            parent_doc = {
                "contract_id": str(contract_id),
                "section_header": chk.get("section_header", "Document"),
                "clause_type": "Section",
                "text": chk["text"],
                "page_number": page_num,
                "metadata": entities
            }
            parent_documents.append(parent_doc)

            child_chunk = {
                "contract_id": str(contract_id),
                "text": chk["text"],
                "clause_type": chk.get("clause_type", "Clause"),
                "entities": entities
            }
            child_chunks.append(child_chunk)

    if not child_chunks:
        return 0

    parent_texts = [p["text"] for p in parent_documents]
    parent_embeddings = generate_embeddings(parent_texts)

    child_texts = [c["text"] for c in child_chunks]
    child_embeddings = generate_embeddings(child_texts)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        parent_ids = []
        for parent, emb in zip(parent_documents, parent_embeddings):
            cursor.execute(
                """
                INSERT INTO parent_documents
                (contract_id, section_header, clause_type, text, embedding, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    parent["contract_id"],
                    parent["section_header"],
                    parent["clause_type"],
                    parent["text"],
                    str(emb),
                    json.dumps(parent["metadata"])
                )
            )
            parent_id = cursor.fetchone()[0]
            parent_ids.append(parent_id)

        for i, (child, emb) in enumerate(zip(child_chunks, child_embeddings)):
            parent_id = parent_ids[min(i, len(parent_ids) - 1)]

            cursor.execute(
                """
                INSERT INTO clauses
                (contract_id, text, clause_type, entities, embedding, parent_document_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    child["contract_id"],
                    child["text"],
                    child["clause_type"],
                    json.dumps(child["entities"]),
                    str(emb),
                    str(parent_id)
                )
            )

        conn.commit()
        cursor.close()
        return len(child_chunks)
    finally:
        release_db_connection(conn)

@celery_app.task
def ingest_contract_task(contract_id: Any, file_path: str) -> int:
    return ingest_contract_with_parents(contract_id, file_path)
