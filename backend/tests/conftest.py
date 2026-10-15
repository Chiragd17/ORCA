import pytest
import os
import sys

# Ensure backend root and project root are on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
repo_path = os.path.abspath(os.path.join(backend_path, ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
if repo_path not in sys.path:
    sys.path.insert(0, repo_path)
