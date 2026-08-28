import os
import re
import math
import tempfile
import pytest
import numpy as np
from hypothesis import given, strategies as st, settings, HealthCheck
from fastapi.testclient import TestClient

from src.backend.app.utils.helpers import clean_text, chunk_text, validate_contract_metadata
from src.backend.app.services.rag import compute_cosine_similarity
from src.backend.app.models.contracts import ContractCreate
from src.backend.app.utils.file_processing import process_uploaded_file
from src.backend.app.main import app

client = TestClient(app)


# ----------------------------------------------------------------------
# Property 1 & 2: Text Chunking Invariants
# ----------------------------------------------------------------------

@given(
    text=st.text(min_size=0, max_size=5000),
    chunk_size=st.integers(min_value=1, max_value=512)
)
def test_chunk_text_reconstruction_property(text: str, chunk_size: int):
    """Property: Concatenating chunks must reconstruct the original text exactly."""
    chunks = chunk_text(text, chunk_size)
    assert "".join(chunks) == text


@given(
    text=st.text(min_size=1, max_size=5000),
    chunk_size=st.integers(min_value=1, max_value=512)
)
def test_chunk_text_bounds_property(text: str, chunk_size: int):
    """Property: Every chunk must not exceed chunk_size, and non-terminal chunks must be exactly chunk_size."""
    chunks = chunk_text(text, chunk_size)
    assert len(chunks) == math.ceil(len(text) / chunk_size)
    for i, chunk in enumerate(chunks):
        assert len(chunk) <= chunk_size
        if i < len(chunks) - 1:
            assert len(chunk) == chunk_size


# ----------------------------------------------------------------------
# Property 3 & 4: Text Normalization Invariants
# ----------------------------------------------------------------------

@given(text=st.text(min_size=0, max_size=1000))
def test_clean_text_idempotence_property(text: str):
    """Property: clean_text must be idempotent: f(f(x)) == f(x)."""
    cleaned_once = clean_text(text)
    cleaned_twice = clean_text(cleaned_once)
    assert cleaned_once == cleaned_twice


@given(text=st.text(min_size=0, max_size=1000))
def test_clean_text_formatting_invariants(text: str):
    """Property: Cleaned text has no consecutive whitespace, no leading/trailing whitespace, and no disallowed symbols."""
    cleaned = clean_text(text)
    # No multiple spaces
    assert re.search(r'\s{2,}', cleaned) is None
    # No leading or trailing whitespace
    assert cleaned == cleaned.strip()
    # No non-alphanumeric/non-whitespace characters
    assert re.search(r'[^\w\s]', cleaned) is None


# ----------------------------------------------------------------------
# Property 5: Metadata Validation Soundness
# ----------------------------------------------------------------------

@given(data=st.dictionaries(keys=st.text(min_size=1, max_size=20), values=st.text(max_size=50)))
def test_validate_contract_metadata_soundness_property(data: dict):
    """Property: Metadata is valid if and only if 'name' and 'file_path' are present keys."""
    expected = ("name" in data) and ("file_path" in data)
    assert validate_contract_metadata(data) == expected


# ----------------------------------------------------------------------
# Property 6, 7 & 8: Vector Cosine Similarity Mathematical Properties
# ----------------------------------------------------------------------

@given(
    vec=st.lists(
        st.floats(min_value=-100.0, max_value=100.0, allow_nan=False, allow_infinity=False),
        min_size=2,
        max_size=128
    )
)
def test_cosine_similarity_reflexivity_property(vec: list):
    """Property: Any non-zero vector compared with itself has cosine similarity ~ 1.0."""
    arr = np.array(vec, dtype=np.float64)
    norm = np.linalg.norm(arr)
    sim = compute_cosine_similarity(arr, arr)
    if norm == 0.0:
        assert sim == 0.0
    else:
        assert math.isclose(sim, 1.0, rel_tol=1e-5, abs_tol=1e-5)


@given(st.data())
def test_cosine_similarity_symmetry_and_bounds_property(data):
    """Property: Cosine similarity is symmetric and bounded in [-1.0, 1.0]."""
    dim = data.draw(st.integers(min_value=2, max_value=64))
    vec_a = np.array(data.draw(st.lists(st.floats(-50.0, 50.0, allow_nan=False, allow_infinity=False), min_size=dim, max_size=dim)))
    vec_b = np.array(data.draw(st.lists(st.floats(-50.0, 50.0, allow_nan=False, allow_infinity=False), min_size=dim, max_size=dim)))

    sim_ab = compute_cosine_similarity(vec_a, vec_b)
    sim_ba = compute_cosine_similarity(vec_b, vec_a)

    # Symmetry
    assert math.isclose(sim_ab, sim_ba, rel_tol=1e-6, abs_tol=1e-6)
    # Bounded range [-1.0, 1.0] (allowing slight float epsilon)
    assert -1.00001 <= sim_ab <= 1.00001


# ----------------------------------------------------------------------
# Property 9: Pydantic Contract Model Round-trip Invariance
# ----------------------------------------------------------------------

@given(
    name=st.text(min_size=1, max_size=100),
    file_path=st.text(min_size=1, max_size=200),
    metadata=st.dictionaries(keys=st.text(min_size=1, max_size=20), values=st.text(max_size=50))
)
def test_contract_create_model_roundtrip_property(name: str, file_path: str, metadata: dict):
    """Property: ContractCreate model dumps and validates without information mutation."""
    contract = ContractCreate(name=name, file_path=file_path, metadata=metadata)
    dumped = contract.model_dump()
    reconstituted = ContractCreate(**dumped)
    assert contract == reconstituted


# ----------------------------------------------------------------------
# Property 10: File Upload Format Rejection Safety
# ----------------------------------------------------------------------

@given(ext=st.sampled_from([".exe", ".bin", ".py", ".csv", ".json", ".sh", ".zip"]))
def test_process_uploaded_file_unsupported_extension_rejection(ext: str):
    """Property: Unsupported file extensions must unconditionally raise ValueError."""
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(b"dummy payload")
        tmp_path = tmp.name

    try:
        with pytest.raises(ValueError, match="Unsupported file format"):
            process_uploaded_file(tmp_path)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# ----------------------------------------------------------------------
# System Verification: FastAPI Gateway
# ----------------------------------------------------------------------

def test_fastapi_gateway_health():
    """Verify health endpoint operates as expected."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "docusage"}


def test_fastapi_gateway_root():
    """Verify root endpoint responds with metadata."""
    response = client.get("/")
    assert response.status_code == 200
    assert "docs_url" in response.json()
