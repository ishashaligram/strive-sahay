"""Keep unit-test doubles independent of the developer's private model selection."""
import pytest

@pytest.fixture(autouse=True)
def isolated_model_selection(monkeypatch):
    monkeypatch.setenv('QWEN_MODEL','qwen3:8b')
