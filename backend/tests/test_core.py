import pytest
from core.money import equal_split, validate_exact, validate_members
from core.balances import net_balances, simplify, validate_settlement, can_remove_member

def test_equal_split_100_by_3():
    s = equal_split(10000, ["c", "a", "b"])
    assert sum(s.values()) == 10000 and s == {"a": 3334, "b": 3333, "c": 3333}

def test_equal_split_always_sums():
    for total in range(1, 500):
        for n in range(1, 8):
            assert sum(equal_split(total, [str(i) for i in range(n)]).values()) == total

def test_exact_mismatch_message():
    with pytest.raises(ValueError, match="Shares add up to 90.00, expense is 100.00"):
        validate_exact(10000, {"a": 5000, "b": 4000})

def test_rejects_non_positive_and_outsiders():
    with pytest.raises(ValueError): equal_split(0, ["a"])
    with pytest.raises(ValueError): validate_members({"a"}, "a", ["a", "z"])

def test_balances_and_simplify():
    ex = [{"payer": "a", "amount": 9000, "shares": equal_split(9000, ["a", "b", "c"])}]
    net = net_balances(ex, [])
    assert net == {"a": 6000, "b": -3000, "c": -3000} and sum(net.values()) == 0
    assert sorted(simplify(net)) == [("b", "a", 3000), ("c", "a", 3000)]

def test_settlement_and_removal():
    ex = [{"payer": "a", "amount": 9000, "shares": equal_split(9000, ["a", "b", "c"])}]
    net = net_balances(ex, [])
    with pytest.raises(ValueError): validate_settlement(net, "b", "a", -1)
    with pytest.raises(ValueError): validate_settlement(net, "a", "b", 100)
    validate_settlement(net, "b", "a", 3000)
    net = net_balances(ex, [{"from_user": "b", "to_user": "a", "amount": 3000}])
    assert can_remove_member(net, "b") and not can_remove_member(net, "c")
