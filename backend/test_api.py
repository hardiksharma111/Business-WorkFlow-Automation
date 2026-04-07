#!/usr/bin/env python3
"""
Smoke tests for Chat Business Workflow Automation API
Tests core endpoints to ensure backend functionality
"""

import httpx
import json
from typing import Any

BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"


def test_system_status() -> dict[str, Any]:
    """Test system status endpoint"""
    with httpx.Client() as client:
        response = client.get(f"{BASE_URL}{API_PREFIX}/system/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "overall" in data, "Missing 'overall' field"
        print("✓ System status endpoint OK")
        return data


def test_workflows_tasks() -> dict[str, Any]:
    """Test workflows tasks endpoint"""
    with httpx.Client() as client:
        response = client.get(f"{BASE_URL}{API_PREFIX}/workflows/tasks?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Workflows tasks endpoint OK (retrieved {len(data)} tasks)")
        return data


def test_analytics_overview() -> dict[str, Any]:
    """Test analytics overview endpoint"""
    with httpx.Client() as client:
        response = client.get(f"{BASE_URL}{API_PREFIX}/analytics/overview?limit=50")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        required_fields = ["total_tasks", "completed_tasks", "failed_tasks"]
        for field in required_fields:
            assert field in data, f"Missing '{field}' in analytics response"
        print("✓ Analytics overview endpoint OK")
        return data


def test_system_models() -> list:
    """Test model listing endpoint"""
    with httpx.Client() as client:
        response = client.get(f"{BASE_URL}{API_PREFIX}/system/ollama/models")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "models" in data, "Missing 'models' field"
        print(f"✓ Model listing endpoint OK (found {len(data['models'])} models)")
        return data


def run_all_tests() -> bool:
    """Run all smoke tests"""
    print("\n" + "=" * 60)
    print("SMOKE TESTS FOR CHAT BUSINESS WORKFLOW AUTOMATION")
    print("=" * 60 + "\n")

    tests = [
        ("System Status", test_system_status),
        ("Workflows Tasks", test_workflows_tasks),
        ("Analytics Overview", test_analytics_overview),
        ("Model Listing", test_system_models),
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        try:
            result = test_func()
            passed += 1
        except AssertionError as e:
            print(f"✗ {test_name} FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ {test_name} ERROR: {e}")
            failed += 1

    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60 + "\n")

    return failed == 0


if __name__ == "__main__":
    import sys
    success = run_all_tests()
    sys.exit(0 if success else 1)
