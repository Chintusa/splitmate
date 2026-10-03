"""Money is stored as integer minor units (paisa/cents). Never floats."""

def fmt(minor: int) -> str:
    return f"{minor // 100}.{abs(minor) % 100:02d}"

def equal_split(total: int, member_ids: list[str]) -> dict[str, int]:
    """Rounding rule: base = total // n; the first (total % n) members,
    ordered by member id, get +1 minor unit. Deterministic, sums exactly."""
    if total <= 0:
        raise ValueError("Amount must be positive")
    ids = sorted(set(member_ids))
    if not ids:
        raise ValueError("Select at least one member")
    base, rem = divmod(total, len(ids))
    return {m: base + (1 if i < rem else 0) for i, m in enumerate(ids)}

def validate_exact(total: int, shares: dict[str, int]) -> dict[str, int]:
    if total <= 0:
        raise ValueError("Amount must be positive")
    if any(v < 0 for v in shares.values()):
        raise ValueError("Shares cannot be negative")
    s = sum(shares.values())
    if s != total:
        raise ValueError(f"Shares add up to {fmt(s)}, expense is {fmt(total)}")
    return shares

def validate_members(group_members: set[str], payer: str, share_ids) -> None:
    if payer not in group_members:
        raise ValueError("Payer is not a member of this group")
    bad = set(share_ids) - group_members
    if bad:
        raise ValueError("Every member in the split must belong to the group")
