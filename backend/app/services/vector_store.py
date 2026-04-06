from __future__ import annotations

from typing import Any

import chromadb

from app.models import KnowledgeMatch


class VectorStoreService:
    def __init__(self, persist_path: str, collection_name: str) -> None:
        self._client = chromadb.PersistentClient(path=persist_path)
        self._collection = self._client.get_or_create_collection(name=collection_name)

    def upsert_documents(
        self,
        ids: list[str],
        texts: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> None:
        self._collection.upsert(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    def query(self, embedding: list[float], limit: int = 5) -> list[KnowledgeMatch]:
        result = self._collection.query(query_embeddings=[embedding], n_results=limit)

        ids = result.get("ids", [[]])[0]
        docs = result.get("documents", [[]])[0]
        distances = result.get("distances", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]

        matches: list[KnowledgeMatch] = []
        for doc_id, doc, distance, metadata in zip(ids, docs, distances, metadatas, strict=False):
            score = max(0.0, 1.0 - float(distance)) if distance is not None else 0.0
            matches.append(
                KnowledgeMatch(
                    id=str(doc_id),
                    text=str(doc),
                    score=score,
                    metadata=metadata or {},
                )
            )

        return matches

    def check_health(self) -> tuple[str, str]:
        try:
            count = self._collection.count()
            return "online", f"Chroma collection reachable with {count} documents."
        except Exception as exc:
            return "offline", f"Chroma check failed: {exc}"
