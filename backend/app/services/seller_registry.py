from __future__ import annotations

import re
from html import unescape
from urllib.parse import quote_plus
from urllib.request import Request, urlopen

from app.models import SellerLead


class SellerRegistryService:
    def __init__(self) -> None:
        self._seed_sellers: list[dict[str, object]] = [
            {
                "name": "Northwind Office Supply",
                "category": "office_supplies",
                "summary": "Bulk stationery, pantry stock, and fast office replenishment for recurring requests.",
                "contact": "sales@northwind.example",
                "keywords": ["office", "stationery", "paper", "pens", "bulk", "supply"],
            },
            {
                "name": "Blue Harbor Procurement",
                "category": "general_procurement",
                "summary": "General vendor sourcing for business requests that need quick sourcing and negotiation.",
                "contact": "hello@blueharbor.example",
                "keywords": ["procurement", "vendor", "purchase", "sourcing", "supplier"],
            },
            {
                "name": "Metro Logistics Partners",
                "category": "logistics",
                "summary": "Delivery, freight, and coordination support for time-sensitive fulfillment.",
                "contact": "dispatch@metro.example",
                "keywords": ["logistics", "shipping", "delivery", "freight", "transport"],
            },
            {
                "name": "Cobalt Support Desk",
                "category": "operations_services",
                "summary": "Service and support vendor for operational escalations and internal handoffs.",
                "contact": "support@cobalt.example",
                "keywords": ["support", "service", "helpdesk", "operations", "escalation"],
            },
            {
                "name": "Summit Marketing Studio",
                "category": "marketing",
                "summary": "Brand, creative, and campaign support for lead generation and growth requests.",
                "contact": "studio@summit.example",
                "keywords": ["marketing", "campaign", "creative", "brand", "leads"],
            },
        ]

    def find_local_candidates(
        self,
        message: str,
        decision: dict[str, object],
        metadata: dict[str, object] | None = None,
        limit: int = 3,
    ) -> list[SellerLead]:
        metadata = metadata or {}
        terms = self._build_terms(message, decision, metadata)
        scored: list[tuple[int, SellerLead]] = []

        for seller in self._seed_sellers:
            haystack_parts = [
                str(seller["name"]),
                str(seller["category"]),
                str(seller["summary"]),
                " ".join(str(item) for item in seller.get("keywords", [])),
            ]
            haystack = " ".join(haystack_parts).lower()
            score = sum(1 for term in terms if term in haystack)
            if score > 0:
                scored.append((score, self._to_lead(seller, origin="local_catalog", confidence=min(0.95, 0.45 + (score * 0.12)))))

        scored.sort(key=lambda item: (-item[0], item[1].name))
        results = [lead for _, lead in scored[:limit]]
        if results:
            return results

        return []

    def search_online_candidates(self, message: str, decision: dict[str, object], limit: int = 3) -> list[SellerLead]:
        query = self._build_online_query(message, decision)
        search_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        request = Request(search_url, headers={"User-Agent": "Mozilla/5.0"})

        try:
            with urlopen(request, timeout=10) as response:
                html = response.read().decode("utf-8", errors="ignore")
        except Exception as exc:
            return [
                SellerLead(
                    name="Online search unavailable",
                    category="referral",
                    summary=f"DuckDuckGo referral search failed: {exc}",
                    origin="online_search",
                    url=search_url,
                    confidence=0.0,
                )
            ]

        results: list[SellerLead] = []
        pattern = re.compile(r'<a rel="nofollow" class="result__a" href="(?P<url>[^"]+)">(?P<title>.*?)</a>', re.IGNORECASE)
        for match in pattern.finditer(html):
            title = re.sub(r"<.*?>", "", unescape(match.group("title"))).strip()
            url = unescape(match.group("url")).strip()
            if not title or not url:
                continue

            results.append(
                SellerLead(
                    name=title,
                    category="online_referral",
                    summary=f"Found online for query: {query}",
                    origin="online_search",
                    url=url,
                    confidence=0.58,
                )
            )

            if len(results) >= limit:
                break

        if results:
            return results

        return [
            SellerLead(
                name="Search results unavailable",
                category="online_referral",
                summary=f"No parsed results returned for query: {query}",
                origin="online_search",
                url=search_url,
                confidence=0.0,
            )
        ]

    def _build_terms(self, message: str, decision: dict[str, object], metadata: dict[str, object]) -> list[str]:
        raw_terms = [message, str(decision.get("intent", "")), str(decision.get("recommended_action", ""))]
        for key in ("seller", "vendor", "product", "category", "priority", "budget"):
            value = metadata.get(key)
            if value:
                raw_terms.append(str(value))
        tokens = re.findall(r"[a-z0-9]+", " ".join(raw_terms).lower())
        stop_words = {"and", "the", "for", "with", "from", "need", "please", "want", "this", "that", "into", "our"}
        return [token for token in tokens if token not in stop_words and len(token) > 2]

    def _build_online_query(self, message: str, decision: dict[str, object]) -> str:
        intent = str(decision.get("intent", "seller"))
        action = str(decision.get("recommended_action", "supplier"))
        return f"{message} {intent} {action} supplier vendor wholesale"

    def _to_lead(self, seller: dict[str, object], origin: str, confidence: float) -> SellerLead:
        return SellerLead(
            name=str(seller["name"]),
            category=str(seller["category"]),
            summary=str(seller["summary"]),
            origin=origin,
            contact=str(seller.get("contact")) if seller.get("contact") else None,
            confidence=confidence,
        )
