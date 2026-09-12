from typing import List, Dict, Any, Optional
import logging
from src.backend.app.services.multi_vector_retriever import multi_vector_retriever
from src.backend.app.services.rag import retrieve_relevant_chunks_with_metadata

logger = logging.getLogger("docusage.hybrid_retriever")

class HybridLegalRetriever:
    """
    Combines MultiVectorRetriever (hierarchical) + Existing Hybrid RAG (dense + sparse).
    Best of both worlds: structure + keyword + semantic.
    """

    def __init__(self):
        self.multi_vector = multi_vector_retriever
        self.rag_function = retrieve_relevant_chunks_with_metadata

    async def retrieve(
        self,
        query: str,
        contract_id: Optional[str] = None,
        top_k: int = 5,
        multi_vector_weight: float = 0.6,
        rag_weight: float = 0.4
    ) -> List[Dict[str, Any]]:
        """
        Retrieve clauses using both MultiVector and existing RAG.
        Combines results using weighted fusion.
        """
        try:
            mv_results = await self.multi_vector.retrieve_clauses(
                query=query,
                contract_id=contract_id,
                top_k=top_k
            )

            rag_results = self.rag_function(
                query=query,
                contract_id=contract_id,
                top_k=top_k
            )
            
            # Simple deduplication and scoring fusion
            combined_scores = {}
            results_dict = {}

            # Score MV results
            for i, res in enumerate(mv_results):
                doc_id = res.get("id") or str(i)
                # Assign a score based on rank if not provided
                score = res.get("retrieval_score", 1.0 / (i + 1))
                combined_scores[doc_id] = combined_scores.get(doc_id, 0.0) + (score * multi_vector_weight)
                results_dict[doc_id] = res

            # Score RAG results
            for i, res in enumerate(rag_results):
                doc_id = res.get("id") or str(i + len(mv_results))
                score = res.get("retrieval_score", 1.0 / (i + 1))
                combined_scores[doc_id] = combined_scores.get(doc_id, 0.0) + (score * rag_weight)
                if doc_id not in results_dict:
                    results_dict[doc_id] = res

            # Sort by combined score
            sorted_doc_ids = sorted(combined_scores.keys(), key=lambda x: combined_scores[x], reverse=True)
            
            return [results_dict[doc_id] for doc_id in sorted_doc_ids[:top_k]]

        except Exception as e:
            logger.error(f"❌ Hybrid retrieval failed: {e}")
            return await self.multi_vector.retrieve_clauses(query, contract_id, top_k)

hybrid_retriever = HybridLegalRetriever()
