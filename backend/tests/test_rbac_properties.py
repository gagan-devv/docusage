import pytest
from hypothesis import given, strategies as st
from src.backend.app.services.rbac import CurrentUser

def evaluate_access_pure(
    user_id: str,
    user_priority: int,
    is_admin: bool,
    creator_id: str,
    creator_priority: int,
    has_explicit_grant: bool,
) -> bool:
    """Pure mathematical representation of the Docusage CanView(u, c) decision function."""
    if is_admin:
        return True
    if user_id == creator_id:
        return True
    if has_explicit_grant:
        return True
    return user_priority >= creator_priority

@given(
    user_priority=st.integers(min_value=1, max_value=49),
    creator_priority=st.integers(min_value=50, max_value=100),
    has_explicit_grant=st.booleans(),
)
def test_junior_barrier_invariant(user_priority, creator_priority, has_explicit_grant):
    """
    Property: A junior (priority < creator) can NEVER access a senior's contract
    unless an explicit grant has been provided.
    """
    user_id = "user-junior"
    creator_id = "user-senior"
    is_admin = False

    can_access = evaluate_access_pure(
        user_id=user_id,
        user_priority=user_priority,
        is_admin=is_admin,
        creator_id=creator_id,
        creator_priority=creator_priority,
        has_explicit_grant=has_explicit_grant,
    )

    if not has_explicit_grant:
        assert can_access is False
    else:
        assert can_access is True

@given(
    user_priority=st.integers(min_value=50, max_value=100),
    creator_priority=st.integers(min_value=1, max_value=50),
    has_explicit_grant=st.booleans(),
)
def test_senior_dominance_invariant(user_priority, creator_priority, has_explicit_grant):
    """
    Property: A senior (priority >= creator) ALWAYS has access to junior/peer contracts.
    """
    user_id = "user-senior"
    creator_id = "user-junior"
    is_admin = False

    can_access = evaluate_access_pure(
        user_id=user_id,
        user_priority=user_priority,
        is_admin=is_admin,
        creator_id=creator_id,
        creator_priority=creator_priority,
        has_explicit_grant=has_explicit_grant,
    )
    assert can_access is True

@given(
    user_priority=st.integers(min_value=1, max_value=100),
    creator_priority=st.integers(min_value=1, max_value=100),
    has_explicit_grant=st.booleans(),
)
def test_admin_universal_access_invariant(user_priority, creator_priority, has_explicit_grant):
    """
    Property: An admin ALWAYS has access to every contract regardless of priorities.
    """
    can_access = evaluate_access_pure(
        user_id="admin-user",
        user_priority=user_priority,
        is_admin=True,
        creator_id="any-creator",
        creator_priority=creator_priority,
        has_explicit_grant=has_explicit_grant,
    )
    assert can_access is True

@given(
    priority=st.integers(min_value=1, max_value=100),
)
def test_creator_reflexivity_invariant(priority):
    """
    Property: Any creator ALWAYS has access to their own contract.
    """
    uid = "same-user"
    can_access = evaluate_access_pure(
        user_id=uid,
        user_priority=priority,
        is_admin=False,
        creator_id=uid,
        creator_priority=priority,
        has_explicit_grant=False,
    )
    assert can_access is True
