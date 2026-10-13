"""
LAN discovery, so boxes find the NestGuard laptop without a typed-in IP.

A box broadcasts "NESTGUARD_DISCOVER" over UDP to DISCOVERY_PORT on its Wi-Fi
network; every running NestGuard backend answers "NESTGUARD_HERE <api port>"
straight back to it. The box takes the first answer and posts readings to the
sender's IP on that port. Same idea as a printer showing up on the network.
"""

import asyncio
import logging
import os

REQUEST = b"NESTGUARD_DISCOVER"

logger = logging.getLogger(__name__)


def reply_for(message: bytes, api_port: int) -> bytes | None:
    """The answer to a datagram, or None to ignore it."""
    if message.strip() == REQUEST:
        return f"NESTGUARD_HERE {api_port}".encode()
    return None


class _DiscoveryProtocol(asyncio.DatagramProtocol):
    def __init__(self, api_port: int) -> None:
        self.api_port = api_port
        self.transport: asyncio.DatagramTransport | None = None

    def connection_made(self, transport: asyncio.BaseTransport) -> None:
        self.transport = transport  # type: ignore[assignment]

    def datagram_received(self, data: bytes, addr: tuple[str, int]) -> None:
        reply = reply_for(data, self.api_port)
        if reply and self.transport:
            logger.info("Discovery request from %s, answering", addr[0])
            self.transport.sendto(reply, addr)


async def start(port: int | None = None, api_port: int | None = None) -> asyncio.DatagramTransport | None:
    """Starts answering discovery requests. Ports default to DISCOVERY_PORT /
    API_PORT from the environment (read here, after .env is loaded). Returns
    None, and the API keeps working without discovery, if the port is taken,
    e.g. by a second NestGuard instance on this machine."""
    port = int(os.getenv("DISCOVERY_PORT", "47800")) if port is None else port
    api_port = int(os.getenv("API_PORT", "8000")) if api_port is None else api_port
    loop = asyncio.get_running_loop()
    try:
        transport, _ = await loop.create_datagram_endpoint(
            lambda: _DiscoveryProtocol(api_port), local_addr=("0.0.0.0", port)
        )
    except OSError as err:
        logger.warning("Box discovery disabled: UDP port %s unavailable (%s)", port, err)
        return None
    logger.info("Answering box discovery on UDP port %s", port)
    return transport
