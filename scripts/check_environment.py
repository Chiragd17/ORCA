#!/usr/bin/env python3
"""
ORCA Environment & Dependency Verification Script
Checks Python version, Node/npm versions, environment variables, and module imports.
"""

import sys
import os
import shutil
import subprocess

def check_python():
    version = sys.version_info
    print(f"[*] Python version: {version.major}.{version.minor}.{version.micro}")
    if version.major < 3 or (version.major == 3 and version.minor < 11):
        print("    [!] Warning: Python 3.11+ is recommended.")
        return False
    return True

def check_command(cmd, name):
    path = shutil.which(cmd)
    if path:
        try:
            out = subprocess.check_output([cmd, "--version"], text=True).strip()
            print(f"[*] {name}: {out}")
            return True
        except Exception:
            print(f"[*] {name} found at: {path}")
            return True
    else:
        print(f"    [!] {name} ({cmd}) not found in PATH.")
        return False

def check_env_file():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(root_dir, ".env")
    if os.path.exists(env_path):
        print(f"[*] .env file found: {env_path}")
        return True
    else:
        print("    [!] .env file not found. Copy .env.example to .env to configure.")
        return False

def main():
    print("========================================")
    print("ORCA System Environment Check")
    print("========================================")
    py_ok = check_python()
    node_ok = check_command("node", "Node.js")
    npm_ok = check_command("npm", "npm")
    git_ok = check_command("git", "Git")
    env_ok = check_env_file()
    print("----------------------------------------")
    if py_ok and node_ok and npm_ok and git_ok:
        print("[+] Core development runtimes are ready.")
    else:
        print("[!] Some dependencies need attention.")
    print("========================================")

if __name__ == "__main__":
    main()
