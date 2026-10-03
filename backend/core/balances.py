"""Balances are DERIVED from expenses + settlements, never stored.
net > 0: is owed money. net < 0: owes money."""
from collections import defaultdict

def net_balances(expenses, settlements) -> dict[str, int]:
    """expenses: [{'payer', 'amount', 'shares': {uid: minor}}]
    settlements: [{'from_user', 'to_user', 'amount'}]"""
    net = defaultdict(int)
    for e in expenses:
        net[e["payer"]] += e["amount"]
        for u, s in e["shares"].items():
            net[u] -= s
    for s in settlements:
        net[s["from_user"]] += s["amount"]   # payer of the settlement is credited
        net[s["to_user"]] -= s["amount"]
    return dict(net)

def simplify(net: dict[str, int]) -> list[tuple[str, str, int]]:
    """Greedy: largest debtor pays largest creditor. Returns (debtor, creditor, amt)."""
    debtors = sorted([[u, -v] for u, v in net.items() if v < 0], key=lambda x: (-x[1], x[0]))
    creditors = sorted([[u, v] for u, v in net.items() if v > 0], key=lambda x: (-x[1], x[0]))
    out, i, j = [], 0, 0
    while i < len(debtors) and j < len(creditors):
        amt = min(debtors[i][1], creditors[j][1])
        out.append((debtors[i][0], creditors[j][0], amt))
        debtors[i][1] -= amt; creditors[j][1] -= amt
        if debtors[i][1] == 0: i += 1
        if creditors[j][1] == 0: j += 1
    return out

def validate_settlement(net, frm, to, amount) -> None:
    if amount <= 0:
        raise ValueError("Settlement amount must be positive")
    if frm == to:
        raise ValueError("Cannot settle with yourself")
    owes, owed = -net.get(frm, 0), net.get(to, 0)
    if owes <= 0 or owed <= 0:
        raise ValueError("No outstanding balance between these members")
    if amount > min(owes, owed):
        raise ValueError("Amount exceeds what is owed")

def can_remove_member(net, uid) -> bool:
    return net.get(uid, 0) == 0
