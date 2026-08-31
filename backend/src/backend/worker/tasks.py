from src.backend.worker.celery_app import celery_app
from src.backend.app.utils.file_processing import process_uploaded_file
from src.backend.app.utils.helpers import chunk_text
from src.backend.app.services.rag import generate_embeddings
from src.backend.app.utils.db import get_db_connection, release_db_connection
import json

from typing import Any

def ingest_contract(contract_id: Any, file_path: str) -> int:
    """Extract text, chunk, embed, and store clauses in DB."""
    # ponytail: naive file parser dispatch, OCR pipeline if scanned PDFs matter
    content = process_uploaded_file(file_path)
    text = content["text"] if isinstance(content, dict) else content
    text = text.replace("\x00", "")
    if not text.strip():
        return 0

    chunks = chunk_text(text, chunk_size=512)
    cleaned_chunks = [c.replace("\x00", "") for c in chunks if c.strip()]
    if not cleaned_chunks:
        return 0

    embeddings = generate_embeddings(cleaned_chunks)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        for chunk, emb in zip(cleaned_chunks, embeddings):
            cursor.execute(
                "INSERT INTO clauses (contract_id, text, embedding) VALUES (%s, %s, %s)",
                (str(contract_id), chunk, str(emb))
            )
        conn.commit()
        cursor.close()
        return len(cleaned_chunks)
    finally:
        release_db_connection(conn)

@celery_app.task
def ingest_contract_task(contract_id: Any, file_path: str) -> int:
    return ingest_contract(contract_id, file_path)
