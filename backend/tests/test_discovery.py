import asyncio
import hashlib
import hmac
import socket

from app import discovery

KEY = "test-key"
NONCE = "a1b2c3d4e5f60718"


def _expected_proof(nonce: str, port: int, ip: str, key: str = KEY) -> str:
    return hmac.new(key.encode(), f"{nonce}:{port}:{ip}".encode(), hashlib.sha256).hexdigest()


def test_reply_carries_port_and_proof_bound_to_nonce_port_and_ip():
    reply = discovery.reply_for(f"NESTGUARD_DISCOVER {NONCE}".encode(), 8000, KEY, "192.168.1.23")
    assert reply == f"NESTGUARD_HERE 8000 {_expected_proof(NONCE, 8000, '192.168.1.23')}".encode()


def test_proof_differs_for_another_key_ip_or_nonce():
    base = discovery.proof(KEY, NONCE, 8000, "192.168.1.23")
    assert discovery.proof("other-key", NONCE, 8000, "192.168.1.23") != base
    assert discovery.proof(KEY, NONCE, 8000, "192.168.1.66") != base
    assert discovery.proof(KEY, "ffffffffffffffff", 8000, "192.168.1.23") != base


def test_ignores_requests_without_a_valid_nonce():
    for message in [b"NESTGUARD_DISCOVER", b"NESTGUARD_DISCOVER short", b"NESTGUARD_DISCOVER bad-nonce!!", b"hello", b""]:
        assert discovery.reply_for(message, 8000, KEY, "192.168.1.23") is None


def test_responder_answers_a_box_over_udp_with_a_verifiable_proof():
    async def scenario() -> bytes:
        transport = await discovery.start(port=0, api_port=8123, api_key=KEY)  # port 0: any free port
        assert transport is not None
        port = transport.get_extra_info("sockname")[1]
        box = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        box.setblocking(False)
        try:
            box.sendto(f"NESTGUARD_DISCOVER {NONCE}".encode(), ("127.0.0.1", port))
            return await asyncio.wait_for(asyncio.get_running_loop().sock_recv(box, 128), timeout=2)
        finally:
            box.close()
            transport.close()

    # What the box does: recompute the proof with the IP the answer came from.
    assert asyncio.run(scenario()) == f"NESTGUARD_HERE 8123 {_expected_proof(NONCE, 8123, '127.0.0.1')}".encode()


def test_start_returns_none_when_port_is_taken():
    async def scenario() -> None:
        first = await discovery.start(port=0, api_port=8000, api_key=KEY)
        assert first is not None
        port = first.get_extra_info("sockname")[1]
        try:
            assert await discovery.start(port=port, api_port=8000, api_key=KEY) is None
        finally:
            first.close()

    asyncio.run(scenario())
