CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Organizations & Multi-tenancy
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Dynamic Organization Roles with Priority Rankings (1-100)
CREATE TABLE IF NOT EXISTS organization_roles (
    id SERIAL PRIMARY KEY,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    priority INT NOT NULL CHECK (priority >= 1 AND priority <= 100),
    description TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(org_id, role_name)
);

-- 4. Organization Membership with Priority Linkage
CREATE TABLE IF NOT EXISTS organization_members (
    id SERIAL PRIMARY KEY,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES organization_roles(id) ON DELETE RESTRICT,
    custom_priority_override INT CHECK (custom_priority_override >= 1 AND custom_priority_override <= 100),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- 5. Contracts with Organization and Creator Context
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    metadata JSONB,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    access_scope VARCHAR(20) DEFAULT 'seniority',
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS access_scope VARCHAR(20) DEFAULT 'seniority';

-- 6. Granular Contract Access Grants (Explicit Senior-to-Junior Overrides)
CREATE TABLE IF NOT EXISTS contract_access_grants (
    id SERIAL PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    granted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    permission_level VARCHAR(20) DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
    expires_at TIMESTAMP NULL,
    granted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(contract_id, user_id)
);

-- 7. Refresh Tokens & Sessions (TTL: 7 Days)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    family_id UUID NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Email Verification & OTP Codes (TTL: 10 Minutes)
CREATE TABLE IF NOT EXISTS auth_otp_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'login',
    expires_at TIMESTAMP NOT NULL,
    attempts INT DEFAULT 0,
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

-- Seed Default Organization and Roles
DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
    v_senior_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
    v_assoc_id UUID := '00000000-0000-0000-0000-000000000003'::uuid;
    v_junior_id UUID := '00000000-0000-0000-0000-000000000004'::uuid;
    v_org_id UUID := '11111111-1111-1111-1111-111111111111'::uuid;
    v_role_partner INT;
    v_role_senior INT;
    v_role_assoc INT;
    v_role_junior INT;
BEGIN
    -- Seed Default Users
    INSERT INTO users (id, email, name) VALUES
        (v_admin_id, 'admin@docusage.ai', 'Eleanor Vance (Managing Partner)'),
        (v_senior_id, 'senior@docusage.ai', 'Marcus Sterling (Senior Counsel)'),
        (v_assoc_id, 'associate@docusage.ai', 'David Kim (Associate Attorney)'),
        (v_junior_id, 'junior@docusage.ai', 'Clara Oswald (Junior Legal Analyst)')
    ON CONFLICT (email) DO NOTHING;

    -- Seed Default Organization
    INSERT INTO organizations (id, name, slug, owner_id) VALUES
        (v_org_id, 'Acme Global Legal', 'acme-legal', v_admin_id)
    ON CONFLICT (slug) DO NOTHING;

    -- Seed Roles with Hierarchical Priorities
    INSERT INTO organization_roles (org_id, role_name, priority, description, is_admin) VALUES
        (v_org_id, 'Partner', 90, 'Executive Partner with full organizational and document authority', TRUE)
    ON CONFLICT (org_id, role_name) DO UPDATE SET priority = EXCLUDED.priority RETURNING id INTO v_role_partner;

    INSERT INTO organization_roles (org_id, role_name, priority, description, is_admin) VALUES
        (v_org_id, 'Senior Counsel', 70, 'Senior Counsel supervising agreements and department audits', FALSE)
    ON CONFLICT (org_id, role_name) DO UPDATE SET priority = EXCLUDED.priority RETURNING id INTO v_role_senior;

    INSERT INTO organization_roles (org_id, role_name, priority, description, is_admin) VALUES
        (v_org_id, 'Associate', 40, 'Associate attorney handling bilateral review and negotiations', FALSE)
    ON CONFLICT (org_id, role_name) DO UPDATE SET priority = EXCLUDED.priority RETURNING id INTO v_role_assoc;

    INSERT INTO organization_roles (org_id, role_name, priority, description, is_admin) VALUES
        (v_org_id, 'Junior Analyst', 20, 'Junior legal analyst assisting on clause indexing and extraction', FALSE)
    ON CONFLICT (org_id, role_name) DO UPDATE SET priority = EXCLUDED.priority RETURNING id INTO v_role_junior;

    -- Assign Memberships
    IF v_role_partner IS NOT NULL THEN
        INSERT INTO organization_members (org_id, user_id, role_id) VALUES (v_org_id, v_admin_id, v_role_partner) ON CONFLICT DO NOTHING;
    END IF;
    IF v_role_senior IS NOT NULL THEN
        INSERT INTO organization_members (org_id, user_id, role_id) VALUES (v_org_id, v_senior_id, v_role_senior) ON CONFLICT DO NOTHING;
    END IF;
    IF v_role_assoc IS NOT NULL THEN
        INSERT INTO organization_members (org_id, user_id, role_id) VALUES (v_org_id, v_assoc_id, v_role_assoc) ON CONFLICT DO NOTHING;
    END IF;
    IF v_role_junior IS NOT NULL THEN
        INSERT INTO organization_members (org_id, user_id, role_id) VALUES (v_org_id, v_junior_id, v_role_junior) ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Seed default enterprise policies if not present
INSERT INTO policies (name, rules)
SELECT
    'Corporate Commercial MSA Policy',
    '[
        {"name": "Limitation of Liability Cap", "query": "limitation of liability cap aggregate liability", "threshold": 0.8},
        {"name": "Governing Law (New York)", "query": "governing law jurisdiction New York", "threshold": 0.85},
        {"name": "Mutual Indemnification", "query": "indemnify hold harmless mutual third party claims", "threshold": 0.75}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM policies WHERE name = 'Corporate Commercial MSA Policy');

INSERT INTO policies (name, rules)
SELECT
    'Institutional MoU & Event Policy',
    '[
        {"name": "Governing Law (India / Gwalior)", "query": "governing law jurisdiction dispute resolution India Gwalior Madhya Pradesh", "threshold": 0.8},
        {"name": "Force Majeure Rescheduling", "query": "force majeure act of God rescheduling performance advance refund", "threshold": 0.8},
        {"name": "Cancellation & Logistics Reimbursement", "query": "cancellation unspent advances logistics non-recoverable refund", "threshold": 0.75},
        {"name": "Authorized Signatories", "query": "authorized signatory Director President SAC Cultural Associate Dean", "threshold": 0.7}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM policies WHERE name = 'Institutional MoU & Event Policy');

INSERT INTO policies (name, rules)
SELECT
    'Budget & Financial Allocation Policy',
    '[
        {"name": "Advance Disbursement Cap (<= 70%)", "query": "advance payment percentage 70% booking confirm arrangements", "threshold": 0.8},
        {"name": "Itemized Expenditure Breakdown", "query": "item description amount budget allocation production banners decor sound", "threshold": 0.8},
        {"name": "Post-Event Documentation & Bills", "query": "expenses documented bills submitted post-event account reconciliation", "threshold": 0.75},
        {"name": "Dean & Faculty Approval", "query": "approval support FiC Dean Student Affairs Associate Dean SAC", "threshold": 0.75}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM policies WHERE name = 'Budget & Financial Allocation Policy');

INSERT INTO policies (name, rules)
SELECT
    'NDA & Bilateral Confidentiality Policy',
    '[
        {"name": "Definition of Confidential Information", "query": "confidential information trade secrets proprietary technical commercial", "threshold": 0.8},
        {"name": "Non-Disclosure & Standard of Care", "query": "non-disclosure reasonable care protect third party unauthorized access", "threshold": 0.8},
        {"name": "Term & Survival Duration", "query": "term of agreement years survival obligation return destroy materials", "threshold": 0.75}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM policies WHERE name = 'NDA & Bilateral Confidentiality Policy');