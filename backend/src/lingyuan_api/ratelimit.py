import hashlib
import hmac
import ipaddress
import math
import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from lingyuan_api.config import Settings


class RateLimiter:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client_events: dict[str, deque[float]] = defaultdict(deque)
        self.topic_events: dict[str, deque[float]] = defaultdict(deque)
        self.lock = threading.Lock()

    def client_key(self, request: Request) -> str:
        peer = request.client.host if request.client else "unknown"
        if self.settings.trusted_proxy and request.headers.get("x-forwarded-for"):
            try:
                network = ipaddress.ip_network(self.settings.trusted_proxy, strict=False)
                if ipaddress.ip_address(peer) in network:
                    chain = [
                        ipaddress.ip_address(item.strip())
                        for item in request.headers["x-forwarded-for"].split(",")
                    ]
                    for candidate in reversed(chain):
                        if candidate not in network:
                            peer = str(candidate)
                            break
            except ValueError:
                pass
        return hmac.new(
            self.settings.rate_limit_salt.encode(), peer.encode(), hashlib.sha256
        ).hexdigest()

    def check_and_record(self, key: str, topic: str) -> int | None:
        now = time.monotonic()
        with self.lock:
            client = self.client_events[key]
            shared = self.topic_events[topic]
            while client and client[0] <= now - 86400:
                client.popleft()
            while shared and shared[0] <= now - 3600:
                shared.popleft()
            checks = (
                (client, 600, self.settings.rate_limit_ten_minutes),
                (client, 86400, self.settings.rate_limit_day),
                (shared, 3600, self.settings.rate_limit_topic_hour),
            )
            for events, window, limit in checks:
                recent = [event for event in events if event > now - window]
                if len(recent) >= limit:
                    return max(1, math.ceil(recent[-limit] + window - now))
            client.append(now)
            shared.append(now)
        return None
