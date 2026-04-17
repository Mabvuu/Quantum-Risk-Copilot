import type { CryptoTouchpoint, Severity } from "@/types/report";

type CryptoRule = {
  test: RegExp;
  type: CryptoTouchpoint["type"];
  algorithm: string;
  usage: string;
  severity: Severity;
  reason: string;
};

const CRYPTO_RULES: CryptoRule[] = [
  {
    test: /\becrecover\b/i,
    type: "digital-signature",
    algorithm: "ECDSA / secp256k1",
    usage: "Signature recovery / verification",
    severity: "High",
    reason: "Classical public-key signatures are vulnerable to quantum attacks.",
  },
  {
    test: /\bECDSA\b|\bsecp256k1\b/i,
    type: "wallet-signing",
    algorithm: "ECDSA / secp256k1",
    usage: "Wallet or transaction signing",
    severity: "High",
    reason: "ECC-based signing should be migrated to PQC-safe alternatives over time.",
  },
  {
    test: /\bRSA\b/i,
    type: "certificate",
    algorithm: "RSA",
    usage: "Certificate, auth, or signing flow",
    severity: "High",
    reason: "RSA is vulnerable to Shor-style quantum attacks.",
  },
  {
    test: /\bAES\b/i,
    type: "data-encryption",
    algorithm: "AES",
    usage: "Symmetric data encryption",
    severity: "Low",
    reason: "Symmetric crypto is more quantum-resistant but may need stronger key sizes.",
  },
  {
    test: /\bsha256\b|\bsha512\b|\bkeccak256\b/i,
    type: "password-hashing",
    algorithm: "SHA / Keccak",
    usage: "Hashing or integrity checks",
    severity: "Low",
    reason: "Hashing is less affected, but some contexts may still need review.",
  },
  {
    test: /\bTLS\b|\bhttps\b/i,
    type: "tls",
    algorithm: "TLS",
    usage: "Transport security",
    severity: "Medium",
    reason: "Handshake and certificate layers may rely on quantum-vulnerable primitives.",
  },
  {
    test: /\bJWT\b|\bBearer\b|\bOAuth\b/i,
    type: "api-auth",
    algorithm: "Token / auth flow",
    usage: "API authentication",
    severity: "Medium",
    reason: "Auth systems often depend on classical signatures or certificates.",
  },
];

export function detectCryptoTouchpoints(
  code: string,
  moduleId: string,
  moduleName: string
): CryptoTouchpoint[] {
  const lines = code.split("\n");
  const touchpoints: CryptoTouchpoint[] = [];

  lines.forEach((line, index) => {
    for (const rule of CRYPTO_RULES) {
      if (rule.test.test(line)) {
        touchpoints.push({
          id: `${moduleId}-touchpoint-${index + 1}-${rule.type}`,
          moduleId,
          moduleName,
          type: rule.type,
          algorithm: rule.algorithm,
          usage: rule.usage,
          severity: rule.severity,
          reason: rule.reason,
          line: index + 1,
          snippet: line.trim(),
        });
      }
    }
  });

  return touchpoints;
}