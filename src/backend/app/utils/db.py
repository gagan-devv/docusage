import psycopg2
from psycopg2 import pool
from src.backend.app.config import settings

connection_pool = psycopg2.pool.SimpleConnectionPool(
    minconn=1,
    maxconn=10,
    host=settings.db_host,
    port=settings.db_port,
    dbname=settings.db_name,
    user=settings.db_user,
    password=settings.db_password
)

def get_db_connection():
    return connection_pool.getconn()

def release_db_connection():
    connection_pool.putconn()
    
def close_db_connection():
    connection_pool.closeall()