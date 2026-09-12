import os
import sys
import asyncio
import logging

sys.path.append(os.path.abspath('backend'))
from src.backend.app.utils.db import get_db_connection, release_db_connection
from src.backend.worker.tasks import ingest_contract_with_parents

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

async def migrate():
    """Migrate all existing contracts to MultiVector (parent_documents) format."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 1. Fetch all contracts
        cursor.execute("SELECT id, file_path FROM contracts;")
        contracts = cursor.fetchall()
        
        if not contracts:
            logger.info("No contracts found to migrate.")
            return

        logger.info(f"Found {len(contracts)} contracts to migrate.")
        
        for contract_id, file_path in contracts:
            logger.info(f"Migrating contract {contract_id} ({file_path})...")
            
            if not os.path.exists(file_path):
                logger.warning(f"File {file_path} not found for contract {contract_id}, skipping.")
                continue

            # Check if it already has parent documents
            cursor.execute("SELECT COUNT(*) FROM parent_documents WHERE contract_id = %s;", (str(contract_id),))
            count = cursor.fetchone()[0]
            if count > 0:
                logger.info(f"Contract {contract_id} already has {count} parent documents, skipping.")
                continue
            
            # Re-ingest
            # Warning: this will add duplicate clauses if we don't delete existing clauses first.
            logger.info(f"Deleting existing clauses for contract {contract_id}...")
            cursor.execute("DELETE FROM clauses WHERE contract_id = %s;", (str(contract_id),))
            conn.commit()
            
            # Now ingest using the new parent-child chunking
            num_chunks = ingest_contract_with_parents(contract_id, file_path)
            logger.info(f"Migrated contract {contract_id}: {num_chunks} child clauses created with parents.")
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
    finally:
        cursor.close()
        release_db_connection(conn)

if __name__ == "__main__":
    asyncio.run(migrate())
