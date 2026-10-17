import pytest
import os
import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Ensure backend root and project root are on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
repo_path = os.path.abspath(os.path.join(backend_path, ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
if repo_path not in sys.path:
    sys.path.insert(0, repo_path)


@pytest.fixture(scope='session')
def event_loop():
    if sys.platform == 'win32':
        loop = asyncio.WindowsSelectorEventLoopPolicy().new_event_loop()
    else:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as test_client:
        yield test_client

