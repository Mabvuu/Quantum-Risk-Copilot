# Quantum Risk Copilot

**AI-powered blockchain security copilot for system-level and quantum-risk analysis.**

---

## Overview

Quantum Risk Copilot is a security analysis engine designed to go beyond traditional smart contract scanners.

Instead of analyzing contracts in isolation, it evaluates **entire blockchain systems** — including multiple contracts, architecture design, and external trust dependencies — while also identifying **quantum-era cryptographic risks**.

This project demonstrates the ability to build practical AI-assisted security tooling for real-world Web3 systems.

---

## Problem

Most existing tools:
- scan a single contract at a time
- focus only on known vulnerabilities
- ignore system-level interactions
- do not account for future quantum threats

Modern blockchain systems are:
- multi-contract
- interconnected
- dependent on off-chain infrastructure (bridges, oracles, relayers)

This creates blind spots in security analysis.

---

## Solution

Quantum Risk Copilot introduces a **system-aware security model** that:

- analyzes multiple contracts together
- detects vulnerabilities across modules
- identifies risky architecture patterns
- flags cryptographic dependencies vulnerable to quantum computing
- provides structured reports and AI-assisted explanations

---

## Key Features

### System-Level Scanning
Analyzes multiple modules as a single system instead of isolated contracts.

### Quantum Risk Detection
Detects cryptographic weaknesses such as:
- ECDSA dependence
- signature-based authentication risks
- hash-based security assumptions

### Cross-Module Risk Analysis
Identifies vulnerabilities that emerge from:
- contract interactions
- shared trust assumptions
- external dependencies

### AI Explanation Layer
Explains detected issues in a structured, readable format for developers.

### Risk Scoring Engine
- Overall score (0–100)
- Severity classification (Low / Medium / High)
- System status (Good / Warning / Risky)

### Developer Workflow
- Paste contracts
- Describe architecture
- Scan instantly
- Review detailed report

---

## Example Insights

The system can identify:

- ECDSA signature dependence (quantum vulnerable)
- Centralized signer risks
- Unsafe external calls
- Weak randomness usage
- Delegatecall vulnerabilities
- Missing upgrade paths for cryptographic migration
- Cross-module trust weaknesses

---

## Tech Stack

- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- Custom rule-based analysis engine
- Optional AI integration layer

---

## How to Run

```bash
npm install
npm run dev