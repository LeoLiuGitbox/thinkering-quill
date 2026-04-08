"""
Thin wrapper around the Anthropic SDK.
Provides chat() for regular responses and stream() for Server-Sent Events.
"""
import os
import anthropic
from config import CLAUDE_MODEL

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


def chat(system: str, user: str, max_tokens: int = 1024) -> str:
    """Single-turn chat, returns the full text response."""
    msg = _get_client().messages.create(
        model=CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return msg.content[0].text


def chat_multimodal(system: str, messages: list, max_tokens: int = 1024) -> str:
    """
    Multi-turn or multimodal call.
    `messages` is a list of Anthropic message dicts (role + content).
    Content can include image blocks for vision tasks.
    """
    msg = _get_client().messages.create(
        model=CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    return msg.content[0].text


def stream(system: str, user_messages: list):
    """
    Generator that yields text chunks for Server-Sent Events.
    `user_messages` is a list of Anthropic message dicts.
    """
    with _get_client().messages.stream(
        model=CLAUDE_MODEL,
        max_tokens=2048,
        system=system,
        messages=user_messages,
    ) as s:
        for text in s.text_stream:
            yield text
