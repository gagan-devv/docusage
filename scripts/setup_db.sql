CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clauses (
    id SERIAL PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    clause_type VARCHAR(100),
    entities JSONB,
    embedding vector(768)
);

CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rules JSONB
);

CREATE TABLE IF NOT EXISTS evals (
    id SERIAL PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    value FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL UNIQUE,
    selected_llm VARCHAR(100) NOT NULL,
    selected_embedding VARCHAR(100) NOT NULL,
    encrypted_api_key TEXT,
    ollama_base_url VARCHAR(255) DEFAULT 'http://localhost:11434',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed default enterprise policy if not present
INSERT INTO policies (name, rules)
SELECT
    'Standard Enterprise Policy 2026',
    '[
        {"name": "Limitation of Liability Cap", "query": "limitation of liability cap aggregate liability", "threshold": 0.8},
        {"name": "Governing Law (New York)", "query": "governing law jurisdiction New York", "threshold": 0.85},
        {"name": "Mutual Indemnification", "query": "indemnify hold harmless mutual third party claims", "threshold": 0.75}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM policies WHERE name = 'Standard Enterprise Policy 2026');