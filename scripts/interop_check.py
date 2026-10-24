"""复刻原 app.py 的 AES-256-GCM 实现，用于验证 Node 版加密互通性"""
import base64
import hashlib
import os
import sys

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

KEY = hashlib.sha256(b"test-secret").digest()


def _b64_pad(s: str) -> str:
    pad = (4 - len(s) % 4) % 4
    return s + "=" * pad if pad else s


def decrypt_url(s: str) -> str:
    raw = base64.urlsafe_b64decode(_b64_pad(s))
    nonce, tag, ciphertext = raw[:12], raw[12:28], raw[28:]
    decryptor = Cipher(algorithms.AES(KEY), modes.GCM(nonce, tag)).decryptor()
    return (decryptor.update(ciphertext) + decryptor.finalize()).decode("utf-8")


def encrypt_url(url: str) -> str:
    nonce = os.urandom(12)
    encryptor = Cipher(algorithms.AES(KEY), modes.GCM(nonce)).encryptor()
    ciphertext = encryptor.update(url.encode("utf-8")) + encryptor.finalize()
    return base64.urlsafe_b64encode(nonce + encryptor.tag + ciphertext).decode().rstrip("=")


if __name__ == "__main__":
    print("PY_DECRYPTED=" + decrypt_url(sys.argv[1]))
    print("PY_ENCRYPTED=" + encrypt_url(sys.argv[2]))
