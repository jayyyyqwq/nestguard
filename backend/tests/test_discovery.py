import asyncio
import socket

from app import discovery


def test_reply_for_discovery_request_names_the_api_port():
    assert discovery.reply_for(b"NESTGUARD_DISCOVER", 8000) == b"NESTGUARD_HERE 8000"
    assert discovery.reply_for(b"NESTGUARD_DISCOVER\n", 9000) == b"NESTGUARD_HERE 9000"


def test_reply_for_ignores_anything_else():
    assert discovery.reply_for(b"hello", 8000) is None
    assert discovery.reply_for(b"", 8000) is None


def test_responder_answers_a_box_over_udp():
    async def scenario() -> bytes:
        transport = await discovery.start(port=0, api_port=8123)  # port 0: any free port
        assert transport is not None
        port = transport.get_extra_info("sockname")[1]
        box = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        box.setblocking(False)
        try:
            box.sendto(b"NESTGUARD_DISCOVER", ("127.0.0.1", port))
            return await asyncio.wait_for(asyncio.get_running_loop().sock_recv(box, 64), timeout=2)
        finally:
            box.close()
            transport.close()

    assert asyncio.run(scenario()) == b"NESTGUARD_HERE 8123"


def test_start_returns_none_when_port_is_taken():
    async def scenario() -> None:
        first = await discovery.start(port=0, api_port=8000)
        port = first.get_extra_info("sockname")[1]
        try:
            assert await discovery.start(port=port, api_port=8000) is None
        finally:
            first.close()

    asyncio.run(scenario())
