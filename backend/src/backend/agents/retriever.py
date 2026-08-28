from typing import List, Optional
from langchain.chains import RetrievalQA
from langchain_community.vectorstores import PGVector
from langchain_community.embeddings import HuggingFaceEmbeddings
from src.backend.app.config import settings
from src.backend.app.utils.db import get_db_connection

class RetrieverAgent:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-mpnet-base-v2"
        )
        self.vectorstore = PGVector(
            embedding=self.embeddings,
            collection_name="clauses",
            connection_string=f"postgresql://{settings.db_user}:{settings.db_password}@{settings.db_host}:{settings.db_port}/{settings.db_name}"
        )

    def retrieve(self, query: str, contract_id: str, top_k: int = 3) -> List[str]:
        docs = self.vectorstore.similarity_search(
            query, 
            filter={"contract_id": contract_id},
            k=top_k
        )
        return [doc.page_content for doc in docs]