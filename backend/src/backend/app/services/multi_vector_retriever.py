import json
import logging
from typing import Any

import numpy as np
from src.backend.app.config import settings
from src.backend.app.services.rag import (
    compute_bm25_sparse_scores,
    compute_cosine_similarity,
    get_embedding_model,
)
from src.backend.app.utils.db import get_db_connection, release_db_connection

logger = logging.getLogger("docusage.multi_vector")


class LegalMultiVectorRetriever:
    """
    Hierarchical retriever for legal contracts.
    - Parents: Contract sections
    - Children: Individual clauses
    """

    async def retrieve_clauses(
        self,
        query: str,
        contract_id: str | None = None,
        top_k: int = 5,
        use_reranker: bool = False,
        filter_metadata: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Retrieve clauses using MultiVector approach.
        1. Search for matching child clauses using hybrid retrieval.
        2. Resolve those child clauses to their parent documents (sections).
        3. Return the parent documents to provide full section context.
        """
        try:
            import uuid

            if contract_id:
                valid_uuid = str(uuid.UUID(str(contract_id)))
            else:
                valid_uuid = None
        except (ValueError, AttributeError):
            return []

        conn = None
        try:
            conn = get_db_connection()
            model = get_embedding_model()
            query_embedding = model.encode([query])[0]

            cursor = conn.cursor()

            # 1. Fetch child clauses
            if valid_uuid:
                cursor.execute(
                    """
                    SELECT id, text, clause_type, entities, embedding, parent_document_id
                    FROM clauses 
                    WHERE contract_id = %s
                    """,
                    (valid_uuid,),
                )
            else:
                cursor.execute(
                    """
                    SELECT id, text, clause_type, entities, embedding, parent_document_id
                    FROM clauses 
                    """
                )
            rows = cursor.fetchall()

            if not rows:
                cursor.close()
                return []

            all_chunks = []
            dense_scores = []
            for r in rows:
                (
                    clause_id,
                    clause_text,
                    clause_type,
                    raw_entities,
                    clause_emb,
                    parent_doc_id,
                ) = r
                ent_dict = (
                    raw_entities
                    if isinstance(raw_entities, dict)
                    else json.loads(raw_entities)
                    if isinstance(raw_entities, str) and raw_entities.startswith("{")
                    else {}
                )

                chk_obj = {
                    "id": clause_id,
                    "text": clause_text,
                    "clause_type": clause_type or "Clause",
                    "entities": ent_dict,
                    "page_number": ent_dict.get("page_number", 1),
                    "section_header": ent_dict.get("section_header", "Document"),
                    "parent_document_id": parent_doc_id,
                    "contract_id": str(contract_id) if contract_id else None,
                }
                all_chunks.append(chk_obj)

                if clause_emb is not None:
                    sim = compute_cosine_similarity(
                        query_embedding, np.array(clause_emb)
                    )
                else:
                    sim = 0.0
                dense_scores.append(sim)

            # Sparse BM25 scores
            sparse_scores = compute_bm25_sparse_scores(query, all_chunks)

            # RRF Fusion
            dense_ranked_indices = np.argsort(dense_scores)[::-1]
            dense_ranks = {
                idx: rank + 1 for rank, idx in enumerate(dense_ranked_indices)
            }
            sparse_ranked_indices = np.argsort(sparse_scores)[::-1]
            sparse_ranks = {
                idx: rank + 1 for rank, idx in enumerate(sparse_ranked_indices)
            }

            rrf_k = 60.0
            fused_candidates = []
            for idx, chk in enumerate(all_chunks):
                d_rank = dense_ranks[idx]
                s_rank = sparse_ranks[idx]
                rrf_score = (1.0 / (rrf_k + d_rank)) + (1.0 / (rrf_k + s_rank))
                fused_candidates.append((chk, rrf_score))

            fused_candidates.sort(key=lambda x: x[1], reverse=True)

            # 2. Extract top child clauses
            top_child_chunks = [c for c, _ in fused_candidates[: top_k * 2]]

            # 3. Resolve parent documents
            parent_ids = list(
                set(
                    [
                        c["parent_document_id"]
                        for c in top_child_chunks
                        if c["parent_document_id"]
                    ]
                )
            )

            results = []
            if parent_ids:
                format_strings = ",".join(["%s"] * len(parent_ids))
                cursor.execute(
                    f"""
                    SELECT id, text, clause_type, metadata, contract_id
                    FROM parent_documents
                    WHERE id IN ({format_strings})
                    """,
                    tuple(parent_ids),
                )
                parent_rows = cursor.fetchall()

                for pr in parent_rows:
                    p_id, p_text, p_type, p_metadata, p_contract = pr
                    p_meta_dict = (
                        p_metadata
                        if isinstance(p_metadata, dict)
                        else json.loads(p_metadata)
                        if isinstance(p_metadata, str) and p_metadata.startswith("{")
                        else {}
                    )

                    results.append(
                        {
                            "id": str(p_id),
                            "text": p_text,
                            "clause_type": p_type,
                            "entities": p_meta_dict,
                            "page_number": p_meta_dict.get("page_number", 1),
                            "section_header": p_meta_dict.get(
                                "section_header", "Document"
                            ),
                            "parent_document_id": str(p_id),
                            "contract_id": str(p_contract),
                        }
                    )

            # If no parent documents found (e.g. legacy data), fallback to child chunks
            if not results:
                results = top_child_chunks[:top_k]

            cursor.close()

            # Optional Re-ranking
            if use_reranker and settings.enable_reranker and len(results) > 1:
                results = self._rerank_results(query, results)

            return results[:top_k]

        except Exception as e:
            logger.error(f"❌ MultiVector retrieval failed: {e}")
            from src.backend.app.services.rag import (
                retrieve_relevant_chunks_with_metadata,
            )

            return retrieve_relevant_chunks_with_metadata(query, contract_id, top_k)
        finally:
            if conn:
                release_db_connection(conn)

    def _rerank_results(
        self, query: str, results: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Re-rank results using cross-encoder."""
        try:
            # Simple dummy re-ranker logic for now if FlagReranker is not installed
            # You would integrate FlagReranker here.
            return results
        except Exception as e:
            logger.warning(f"⚠️ Re-ranking failed: {e}")
            return results


multi_vector_retriever = LegalMultiVectorRetriever()
