import psycopg2
from psycopg2 import pool
from src.backend.app.config import settings
from typing import Optional

connection_pool: Optional[psycopg2.pool.SimpleConnectionPool] = None

def get_connection_pool() -> psycopg2.pool.SimpleConnectionPool:
    global connection_pool
    if connection_pool is None:
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            host=settings.db_host,
            port=settings.db_port,
            dbname=settings.db_name,
            user=settings.db_user,
            password=settings.db_password
        )
    return connection_pool

def get_db_connection():
    return get_connection_pool().getconn()

def release_db_connection(conn):
    global connection_pool
    if connection_pool is not None and conn is not None:
        connection_pool.putconn(conn)
    
def close_db_connection():
    global connection_pool
    if connection_pool is not None:
        connection_pool.closeall()
        connection_pool = None