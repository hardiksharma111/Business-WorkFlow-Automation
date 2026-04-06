from __future__ import annotations

import hashlib
from typing import Iterable

from sentence_transformers import SentenceTransformer


class EmbeddingService:
    def __init__(self, model_name: str) -> None:
        self._model_name = model_name
        self._model: SentenceTransformer | None = None

    def _ensure_model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = SentenceTransformer(self._model_name)
        return self._model

    def _fallback_embedding(self, text: str, dims: int = 64) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        values = []
        for i in range(dims):
            byte = digest[i % len(digest)]
            values.append((byte / 255.0) * 2.0 - 1.0)
        return values

    def embed(self, texts: Iterable[str]) -> list[list[float]]:
        text_list = list(texts)
        if not text_list:
            return []

        try:
            model = self._ensure_model()
            vectors = model.encode(text_list, normalize_embeddings=True)
            return [vector.tolist() for vector in vectors]
        except Exception:
            return [self._fallback_embedding(text) for text in text_list]

    def check_health(self) -> tuple[str, str]:
        if self._model is None:
            return "loading", "Model is not loaded yet; waiting for first embedding request."

        try:
            self._model.encode(["health ping"], normalize_embeddings=True)
            return "online", "Embedding model is loaded and responsive."
        except Exception as exc:
            return "offline", f"Embedding model error: {exc}"

    def warmup(self) -> tuple[str, str]:
        try:
            model = self._ensure_model()
            model.encode(["warmup ping"], normalize_embeddings=True)
            return "online", "Embedding model warmup completed."
        except Exception as exc:
            return "offline", f"Embedding warmup failed: {exc}"
