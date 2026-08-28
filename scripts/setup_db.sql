CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clauses (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
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
    contract_id INTEGER REFERENCES contracts(id),
    metric_name VARCHAR(100) NOT NULL,
    value FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
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