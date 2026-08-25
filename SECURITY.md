# Security Policy

Vectoris is built with a security-first, local-first engineering posture.

---

## Supported Versions

| Version | Supported |
|---|---|
| 0.2.x | :white_check_mark: Active |
| < 0.2.0 | :x: End of Life |

---

## Reporting a Vulnerability

If you discover a security vulnerability or sensitive data exposure issue in Vectoris:

1. **Do not create public GitHub issues** for security vulnerabilities.
2. Email the core security team at `security@vectoris.ai` with detailed steps to reproduce.
3. Include:
   - Vectoris version and platform (e.g. Windows 11 x86_64)
   - Nature of the vulnerability (e.g. IPC privilege escalation, CSP bypass, cryptographic flaw)
   - Proof of concept or reproduction steps

We will acknowledge receipt within 24 hours and provide an estimated timeline for remediation.

---

## Cryptographic Signing Policy

- Production updates are signed with Ed25519 signing keys.
- Private signing keys are stored exclusively in secure key storage outside of any repository.
- If a private key compromise is suspected, the key will be revoked immediately and a new public key will be bundled in an out-of-band hotfix release.
