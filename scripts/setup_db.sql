CREATE EXTENSION VECTOR

CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE clauses (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    text TEXT NOT NULL,
    clause_type VARCHAR(100),
    entities JSONB,
    embedding vector(768)
);

CREATE TABLE policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rules JSONB
);

CREATE TABLE evals (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    metric_name VARCHAR(100) NOT NULL,
    value FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);