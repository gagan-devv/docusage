from sentence_transformers import SentenceTransformer
from typing import List, Optional
import numpy as np
from src.backend.app.config import settings
from src.backend.app.utils.db import get_db_connection, release_db_connection
from src.backend.app.utils.metrics import rag_search_duration_seconds

_model: Optional[SentenceTransformer] = None

def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")
    return _model

def chunk_contract(file_path: str, chunk_size: int = 512) -> List[str]:
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()

    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

def compute_cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

def generate_embeddings(chunks: List[str]) -> List[List[float]]:
    model = get_embedding_model()
    return model.encode(chunks).tolist()

@rag_search_duration_seconds.time()
def retrieve_relevant_clauses(query: str, contract_id: int, top_k: int = 3) -> List[str]:
    conn = None
    try:
        conn = get_db_connection()
        model = get_embedding_model()
        query_embedding = model.encode([query])[0]
        emb_list = query_embedding.tolist()

        cursor = conn.cursor()
        try:
            # Native pgvector cosine distance operator <=>
            cursor.execute(
                """
                SELECT text 
                FROM clauses 
                WHERE contract_id = %s 
                ORDER BY embedding <=> %s::vector 
                LIMIT %s
                """,
                (contract_id, str(emb_list), top_k)
            )
            rows = cursor.fetchall()
            cursor.close()
            return [r[0] for r in rows]
        except Exception:
            # Fallback to in-memory cosine similarity if pgvector operator is unavailable
            conn.rollback()
            cursor = conn.cursor()
            cursor.execute("SELECT text, embedding FROM clauses WHERE contract_id = %s", (contract_id,))
            clauses = cursor.fetchall()
            cursor.close()

            if not clauses:
                return []

            similarities = []
            for clause_text, clause_embeddings in clauses:
                sim = compute_cosine_similarity(query_embedding, np.array(clause_embeddings))
                similarities.append((clause_text, sim))

            similarities.sort(key=lambda x: x[1], reverse=True)
            return [text for text, _ in similarities[:top_k]]
    except Exception:
        return []
    finally:
        if conn:
            release_db_connection(conn)
