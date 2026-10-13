"""
LAN discovery, so boxes find the NestGuard laptop without a typed-in IP.

A box broadcasts "NESTGUARD_DISCOVER <nonce>" over UDP to DISCOVERY_PORT on its
Wi-Fi network. Every running NestGuard backend answers straight back with

    NESTGUARD_HERE <api port> <proof>

where proof = hex HMAC-SHA256(API_KEY, "<nonce>:<api port>:<this laptop's IP>").
The box recomputes the proof with its own copy of API_KEY and the IP the answer
came from, and ignores any answer that doesn't match. So a device that doesn't
know the key can't pose as NestGuard (and collect the box's readings and API
key), and a real answer can't be replayed or relayed from another IP.
"""

import asyncio
import hashlib
import hmac
import logging
import os
import socket

REQUEST = b"NESTGUARD_DISCOVER"
NONCE_LENGTH = range(8, 65)

logger = logging.getLogger(__name__)


def proof(api_key: str, nonce: str, api_port: int, server_ip: str) -> str:
    message = f"{nonce}:{api_port}:{server_ip}".encode()
    return hmac.new(api_key.encode(), message, hashlib.sha256).hexdigest()


def reply_for(message: bytes, api_port: int, api_key: str, server_ip: str) -> bytes | None:
    """The answer to a datagram, or None to ignore it."""
    parts = message.strip().split()
    if len(parts) != 2 or parts[0] != REQUEST:
        return None
    nonce = parts[1]
    if len(nonce) not in NONCE_LENGTH or not nonce.isalnum():
        return None
    return f"NESTGUARD_HERE {api_port} {proof(api_key, nonce.decode(), api_port, server_ip)}".encode()


def local_ip_towards(remote_ip: str) -> str:
    """This machine's IP on the interface that reaches remote_ip: the address
    the box will see the answer coming from. No packet is sent."""
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
        probe.connect((remote_ip, 9))
        return probe.getsockname()[0]


class _DiscoveryProtocol(asyncio.DatagramProtocol):
    def __init__(self, api_port: int, api_key: str) -> None:
        self.api_port = api_port
        self.api_key = api_key
        self.transport: asyncio.DatagramTransport | None = None

    def connection_made(self, transport: asyncio.BaseTransport) -> None:
        self.transport = transport  # type: ignore[assignment]

    def datagram_received(self, data: bytes, addr: tuple[str, int]) -> None:
        try:
            server_ip = local_ip_towards(addr[0])
        except OSError:
            return
        reply = reply_for(data, self.api_port, self.api_key, server_ip)
        if reply and self.transport:
            logger.info("Discovery request from %s, answering", addr[0])
            self.transport.sendto(reply, addr)


async def start(
    port: int | None = None, api_port: int | None = None, api_key: str | None = None
) -> asyncio.DatagramTransport | None:
    """Starts answering discovery requests. Settings default to DISCOVERY_PORT /
    API_PORT / API_KEY from the environment (read here, after .env is loaded).
    Returns None, and the API keeps working without discovery, if the port is
    taken, e.g. by a second NestGuard instance on this machine."""
    port = int(os.getenv("DISCOVERY_PORT", "47800")) if port is None else port
    api_port = int(os.getenv("API_PORT", "8000")) if api_port is None else api_port
    api_key = os.getenv("API_KEY", "dev-local-key") if api_key is None else api_key
    loop = asyncio.get_running_loop()
    try:
        transport, _ = await loop.create_datagram_endpoint(
            lambda: _DiscoveryProtocol(api_port, api_key), local_addr=("0.0.0.0", port)
        )
    except OSError as err:
        logger.warning("Box discovery disabled: UDP port %s unavailable (%s)", port, err)
        return None
    logger.info("Answering box discovery on UDP port %s", port)
    return transport
