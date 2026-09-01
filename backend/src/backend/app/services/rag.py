import re
import json
from sentence_transformers import SentenceTransformer
from typing import List, Optional, Dict, Any
import numpy as np
from src.backend.app.config import settings
from src.backend.app.utils.db import get_db_connection, release_db_connection
from src.backend.app.utils.metrics import rag_search_duration_seconds

_model: Optional[SentenceTransformer] = None

def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.embedding_model_name)
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


def compute_bm25_sparse_scores(query: str, chunks: List[Dict[str, Any]]) -> List[float]:
    """Compute BM25-style keyword relevance scores for sparse retrieval."""
    if not query or not chunks:
        return [0.0] * len(chunks)

    stop_words = {"the", "a", "an", "and", "or", "in", "on", "at", "of", "to", "for", "with", "by", "is", "be", "are", "this", "that", "shall"}
    query_tokens = [t.lower() for t in re.findall(r'[a-zA-Z0-9%\$]+', query) if t.lower() not in stop_words]
    if not query_tokens:
        query_tokens = [t.lower() for t in query.split()]

    scores = []
    for chk in chunks:
        text = chk.get("text", "").lower()
        score = 0.0
        for token in query_tokens:
            if token in text:
                weight = 2.5 if any(c.isdigit() or c in "%$" for c in token) else 1.0
                freq = text.count(token)
                score += weight * (freq / (freq + 1.0))
        scores.append(score)
    return scores


@rag_search_duration_seconds.time()
def retrieve_relevant_clauses(query: str, contract_id: Any, top_k: int = 3) -> List[str]:
    chunks = retrieve_relevant_chunks_with_metadata(query, contract_id, top_k)
    return [c["text"] for c in chunks]


def retrieve_relevant_chunks_with_metadata(query: str, contract_id: Any, top_k: int = 3) -> List[Dict[str, Any]]:
    """Hybrid Retrieval: Combines pgvector dense cosine similarity with sparse BM25 keyword matching via RRF."""
    try:
        import uuid
        valid_uuid = str(uuid.UUID(str(contract_id)))
    except (ValueError, AttributeError):
        return []

    conn = None
    try:
        conn = get_db_connection()
        model = get_embedding_model()
        query_embedding = model.encode([query])[0]
        emb_list = query_embedding.tolist()

        cursor = conn.cursor()
        
        # 1. Fetch all candidate clauses for the contract
        cursor.execute(
            """
            SELECT id, text, clause_type, entities, embedding
            FROM clauses 
            WHERE contract_id = %s
            """,
            (valid_uuid,)
        )
        rows = cursor.fetchall()
        cursor.close()

        if not rows:
            return []

        all_chunks = []
        dense_scores = []
        for r in rows:
            clause_id, clause_text, clause_type, raw_entities, clause_emb = r
            ent_dict = raw_entities if isinstance(raw_entities, dict) else json.loads(raw_entities) if isinstance(raw_entities, str) and raw_entities.startswith("{") else {}
            
            chk_obj = {
                "id": clause_id,
                "text": clause_text,
                "clause_type": clause_type or "Clause",
                "entities": ent_dict,
                "page_number": ent_dict.get("page_number", 1),
                "section_header": ent_dict.get("section_header", "Document")
            }
            all_chunks.append(chk_obj)

            if clause_emb is not None:
                sim = compute_cosine_similarity(query_embedding, np.array(clause_emb))
            else:
                sim = 0.0
            dense_scores.append(sim)

        # 2. Compute Sparse BM25 scores
        sparse_scores = compute_bm25_sparse_scores(query, all_chunks)

        # 3. Compute Ranks for RRF
        dense_ranked_indices = np.argsort(dense_scores)[::-1]
        dense_ranks = {idx: rank + 1 for rank, idx in enumerate(dense_ranked_indices)}

        sparse_ranked_indices = np.argsort(sparse_scores)[::-1]
        sparse_ranks = {idx: rank + 1 for rank, idx in enumerate(sparse_ranked_indices)}

        # 4. Reciprocal Rank Fusion (RRF) with k=60
        rrf_k = 60.0
        fused_candidates = []
        for idx, chk in enumerate(all_chunks):
            d_rank = dense_ranks[idx]
            s_rank = sparse_ranks[idx]
            rrf_score = (1.0 / (rrf_k + d_rank)) + (1.0 / (rrf_k + s_rank))
            fused_candidates.append((chk, rrf_score))

        fused_candidates.sort(key=lambda x: x[1], reverse=True)
        return [c for c, _ in fused_candidates[:top_k]]
    except Exception:
        return []
    finally:
        if conn:
            release_db_connection(conn)
