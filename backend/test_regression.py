#!/usr/bin/env python3
"""
Regression tests for workflow API behavior.
These tests validate route shape, status patching, and analytics limit clamping.
"""

from __future__ import annotations

import sys
import time
from typing import Any

import httpx

BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"


def assert_json_has(payload: dict[str, Any], keys: list[str]) -> None:
    for key in keys:
        assert key in payload, f"Missing key: {key}"


def test_chat_response_shape() -> str:
    body = {
        "source": "regression_suite",
        "message": "Route this request and suggest a next action.",
        "metadata": {"suite": "regression"},
    }

    response: httpx.Response | None = None
    last_error: Exception | None = None

    for _ in range(3):
        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(f"{BASE_URL}{API_PREFIX}/chat", json=body)
            break
        except Exception as exc:
            last_error = exc
            time.sleep(1)

    if response is None:
        raise AssertionError(f"Chat request did not complete after retries: {last_error}")

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert_json_has(data, ["task", "decision", "route", "assistant_reply"])
    assert data["route"] in {"general_ai", "negotiation"}, "Unexpected route"
    assert_json_has(data["task"], ["id", "status", "source", "message"])
    assert_json_has(data["decision"], ["intent", "confidence", "mode"])

    print(f"✓ Chat route shape OK (route={data['route']})")
    return data["task"]["id"]


def test_patch_task_status(task_id: str) -> None:
    with httpx.Client(timeout=15.0) as client:
        patch_response = client.patch(
            f"{BASE_URL}{API_PREFIX}/workflows/tasks/{task_id}",
            json={"status": "completed"},
        )

    assert patch_response.status_code == 200, f"Expected 200, got {patch_response.status_code}"
    patched = patch_response.json()
    assert patched["status"] == "completed", "Status patch did not persist"
    print("✓ Task status patch OK")


def test_patch_invalid_task_404() -> None:
    with httpx.Client(timeout=15.0) as client:
        response = client.patch(
            f"{BASE_URL}{API_PREFIX}/workflows/tasks/not-a-real-task-id",
            json={"status": "completed"},
        )

    assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    print("✓ Invalid task patch returns 404")


def test_analytics_limit_clamping() -> None:
    with httpx.Client(timeout=15.0) as client:
        high = client.get(f"{BASE_URL}{API_PREFIX}/analytics/overview?limit=999")
        low = client.get(f"{BASE_URL}{API_PREFIX}/analytics/overview?limit=0")

    assert high.status_code == 200, f"Expected 200 for high limit, got {high.status_code}"
    assert low.status_code == 200, f"Expected 200 for low limit, got {low.status_code}"

    high_data = high.json()
    low_data = low.json()

    required_keys = [
        "total_tasks",
        "completed_tasks",
        "failed_tasks",
        "confidence_trend",
        "top_intents",
    ]
    assert_json_has(high_data, required_keys)
    assert_json_has(low_data, required_keys)

    print("✓ Analytics limit clamping OK")


def run_all_tests() -> bool:
    print("\n" + "=" * 62)
    print("REGRESSION TESTS FOR WORKFLOW API")
    print("=" * 62 + "\n")

    passed = 0
    failed = 0

    try:
        task_id = test_chat_response_shape()
        passed += 1
    except Exception as exc:
        failed += 1
        print(f"✗ Chat route shape FAILED: {exc}")
        task_id = ""

    if task_id:
        try:
            test_patch_task_status(task_id)
            passed += 1
        except Exception as exc:
            failed += 1
            print(f"✗ Task status patch FAILED: {exc}")

    try:
        test_patch_invalid_task_404()
        passed += 1
    except Exception as exc:
        failed += 1
        print(f"✗ Invalid task patch FAILED: {exc}")

    try:
        test_analytics_limit_clamping()
        passed += 1
    except Exception as exc:
        failed += 1
        print(f"✗ Analytics clamping FAILED: {exc}")

    print("\n" + "=" * 62)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 62 + "\n")

    return failed == 0


if __name__ == "__main__":
    ok = run_all_tests()
    sys.exit(0 if ok else 1)
