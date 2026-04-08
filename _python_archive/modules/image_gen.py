"""
DALL-E 3 image generation for the Storytelling Cauldron.
Downloads and saves images locally (DALL-E URLs expire after 1 hour).
"""
import os
import uuid
import urllib.request
from pathlib import Path
from openai import OpenAI
from config import DALLE_MODEL, DALLE_SIZE

IMAGES_DIR = Path(__file__).parent.parent / "static" / "writing_images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


def generate_scene_image(description: str) -> tuple[str, str]:
    """
    Generate a DALL-E 3 image from a description.
    Downloads the image and saves it locally.

    Returns:
        (local_path_relative, absolute_path)
        e.g. ("writing_images/abc123.png", "/Users/.../static/writing_images/abc123.png")
    """
    response = _get_client().images.generate(
        model=DALLE_MODEL,
        prompt=description,
        size=DALLE_SIZE,
        quality="standard",
        n=1,
    )
    image_url = response.data[0].url

    filename  = f"{uuid.uuid4().hex}.png"
    abs_path  = IMAGES_DIR / filename
    urllib.request.urlretrieve(image_url, abs_path)

    relative_path = f"writing_images/{filename}"
    return relative_path, str(abs_path)
