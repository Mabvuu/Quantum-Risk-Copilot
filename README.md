# Quantum Risk Copilot

**AI-powered system-wide cryptography discovery, quantum-risk mapping, and post-quantum migration copilot.**

---

## Overview

Quantum Risk Copilot is a security analysis tool built to scan whole software systems, not just one smart contract.

Instead of checking a single file in isolation, it reviews multiple modules together, looks for cryptographic touchpoints, highlights quantum-vulnerable usage, and suggests where post-quantum migration should begin.

The goal is to help teams understand **where cryptography lives in their system**, **what becomes risky in a quantum future**, and **what should be upgraded first**.

---

## Problem

Most security tools:

- scan one contract or file at a time
- focus only on common code bugs
- miss system-wide trust relationships
- do not map cryptography across the full platform
- do not prepare teams for post-quantum migration

But real systems are bigger than one file.

Modern platforms often include:

- smart contracts
- wallets
- APIs
- auth flows
- relayers
- bridges
- oracles
- encrypted storage
- backend services

That means security risk is not only in code mistakes. It is also in how cryptography is used across the whole system.

---

## Solution

Quantum Risk Copilot uses a **system-aware quantum-risk model** that:

- scans multiple modules together
- discovers cryptographic usage across the system
- identifies quantum-sensitive algorithms and trust paths
- highlights cross-module and off-chain risk areas
- suggests post-quantum migration actions
- returns structured results for developers and security teams

---

## Key Features

### Full-System Scanning

Analyzes multiple modules as one connected system instead of treating every file separately.

### Crypto Touchpoint Discovery

Finds where cryptography is being used, such as:

- signatures
- wallet signing
- RSA usage
- hashing
- API auth
- TLS-related flows
- encryption logic

### Quantum Risk Mapping

Flags cryptographic usage that may become unsafe in a quantum future, especially classical public-key systems.

### PQC Migration Guidance

Suggests where migration should start and what safer post-quantum direction to consider.

### Cross-Module Risk Analysis

Highlights risks created by:

- module interactions
- trust boundaries
- off-chain dependencies
- bridge, oracle, and relayer flows

### AI Explanation Layer

Presents findings in a simpler and more readable way for developers.

### Risk Scoring Engine

Returns:

- score from 0 to 100
- severity level
- overall system status

---

## Example Findings

Quantum Risk Copilot can surface things like:

- ECDSA or secp256k1 dependence
- RSA usage in auth or certificates
- TLS flows that may depend on vulnerable handshakes
- API auth paths tied to classical crypto
- unsafe external calls
- weak randomness
- delegatecall risk
- cross-module trust exposure
- missing post-quantum migration planning

---

## Tech Stack

- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **Rule-based analysis engine**
- **Optional AI explanation layer**

---

## How It Works

1. Add multiple system modules
2. Enter architecture notes and known touchpoints
3. Run the audit
4. Review crypto findings, quantum risks, and migration guidance
5. Export the final report

---

## Local Development

```bash
npm install
npm run dev