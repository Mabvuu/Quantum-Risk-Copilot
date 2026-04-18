import {
  CrossModuleRisk,
  ScanIssue,
  Severity,
  SystemScanInput,
} from "@/types/report";

type QuantumPattern = {
  id: string;
  regex: RegExp;
  title: string;
  severity: Severity;
  description: string;
  recommendation: string;
};

function countBySeverity(items: Array<{ severity: Severity }>) {
  return {
    high: items.filter((item) => item.severity === "High").length,
    medium: items.filter((item) => item.severity === "Medium").length,
    low: items.filter((item) => item.severity === "Low").length,
  };
}

export function scanQuantum(code: string): {
  risks: ScanIssue[];
  counts: { high: number; medium: number; low: number };
} {
  const patterns: QuantumPattern[] = [
    {
      id: "quantum-rsa",
      regex:
        /\b(rsa|rsassa|rsa-oaep|pkcs#?1|pkcs1|openssl_rsa|node-rsa|rsacrypto|rsapublickey|rsaprivatekey)\b/i,
      title: "Quantum risk: RSA usage",
      severity: "High",
      description:
        "RSA-based cryptography is vulnerable to Shor-style quantum attacks.",
      recommendation:
        "Plan migration to post-quantum key exchange and signature schemes.",
    },
    {
      id: "quantum-ecc",
      regex:
        /\b(ecc|ecdh|ecdsa|ed25519|curve25519|x25519|secp256k1|secp256r1|p-256|p256|elliptic)\b/i,
      title: "Quantum risk: ECC usage",
      severity: "High",
      description:
        "Elliptic-curve cryptography is vulnerable to quantum attacks.",
      recommendation:
        "Identify ECC touchpoints and prepare a phased PQC migration plan.",
    },
    {
      id: "quantum-dsa",
      regex: /\b(dsa|eddsa)\b/i,
      title: "Quantum risk: classical signing",
      severity: "High",
      description:
        "Classical digital signature algorithms should be reviewed for quantum risk.",
      recommendation:
        "Map all signing flows and prepare PQC-compatible replacements.",
    },
    {
      id: "quantum-certificates",
      regex:
        /\b(tls|ssl|https|x509|x\.509|certificate|cert\b|pem\b|crt\b|jks\b|p12\b|pkcs12)\b/i,
      title: "Quantum risk: certificate dependency",
      severity: "Medium",
      description:
        "Certificate chains and TLS handshakes often depend on classical public-key algorithms.",
      recommendation:
        "Review certificate issuance, trust stores, and TLS dependencies.",
    },
    {
      id: "quantum-symmetric",
      regex:
        /\b(aes(?:-128|-192|-256)?|rijndael|aesgcm|aes-cbc|aes_ctr|encrypt|decrypt|cipher|decipher)\b/i,
      title: "Quantum impact: symmetric encryption",
      severity: "Medium",
      description:
        "Symmetric encryption is less exposed than public-key crypto but still needs key-size review.",
      recommendation:
        "Prefer stronger symmetric settings such as AES-256 where appropriate.",
    },
    {
      id: "quantum-hash",
      regex:
        /\b(sha1|sha-1|sha224|sha-224|sha256|sha-256|sha384|sha-384|sha512|sha-512|keccak|ripemd|blake2|blake3|hashlib|messageDigest|hmac)\b/i,
      title: "Quantum impact: hash usage",
      severity: "Low",
      description:
        "Hash-based operations should be inventoried during quantum-readiness planning.",
      recommendation:
        "Review hashing choices and output strength as part of migration planning.",
    },
  ];

  const risks: ScanIssue[] = patterns
    .filter((pattern) => pattern.regex.test(code))
    .map((pattern) => ({
      id: pattern.id,
      title: pattern.title,
      severity: pattern.severity,
      description: pattern.description,
      recommendation: pattern.recommendation,
    }));

  return {
    risks,
    counts: countBySeverity(risks),
  };
}

export function detectCrossModuleRisks(
  system: SystemScanInput
): CrossModuleRisk[] {
  const risks: CrossModuleRisk[] = [];
  const modules = system.modules.map((module) => module.name);
  const combinedCode = system.modules.map((module) => module.code).join("\n");

  const hasRSA =
    /\b(rsa|rsassa|rsa-oaep|pkcs#?1|pkcs1|openssl_rsa|node-rsa)\b/i.test(
      combinedCode
    );
  const hasECC =
    /\b(ecc|ecdh|ecdsa|ed25519|curve25519|x25519|secp256k1|secp256r1|elliptic)\b/i.test(
      combinedCode
    );
  const hasTLS =
    /\b(tls|ssl|https|x509|x\.509|certificate|cert\b|truststore|keystore)\b/i.test(
      combinedCode
    );
  const hasHardcodedSecrets =
    /\b(private[_-]?key|secret[_-]?key|client[_-]?secret|api[_-]?key|password)\b\s*[:=]/i.test(
      combinedCode
    );
  const hasSigning =
    /\b(sign|verify|signature|createSign|createVerify|SigningKey|ecrecover)\b/i.test(
      combinedCode
    );
  const hasEncryption =
    /\b(encrypt|decrypt|cipher|decipher|aes|rsa|ecc|ecdh|ecdsa)\b/i.test(
      combinedCode
    );

  if (hasRSA && hasECC) {
    risks.push({
      id: "cross-mixed-public-key",
      title: "Mixed public-key cryptography across modules",
      severity: "Medium",
      description:
        "The system appears to use more than one classical public-key family across different modules.",
      recommendation:
        "Create one crypto inventory and define a single migration strategy across the full system.",
      modules,
    });
  }

  if (hasTLS && (hasRSA || hasECC)) {
    risks.push({
      id: "cross-certificate-dependency",
      title: "Certificate and handshake dependency across the system",
      severity: "Medium",
      description:
        "TLS/certificate flows may depend on classical public-key algorithms in multiple places.",
      recommendation:
        "Map certificate issuance, trust chains, and handshake dependencies before PQC migration.",
      modules,
    });
  }

  if (hasHardcodedSecrets) {
    risks.push({
      id: "cross-hardcoded-secrets",
      title: "Hardcoded secrets or key material found across modules",
      severity: "High",
      description:
        "One or more modules appear to expose keys, passwords, or secret material directly in code or config-like content.",
      recommendation:
        "Move secrets into secure storage and review all key lifecycle handling.",
      modules,
    });
  }

  if (hasSigning && hasEncryption) {
    risks.push({
      id: "cross-signing-encryption-coupling",
      title: "Multiple cryptographic responsibilities spread across modules",
      severity: "Medium",
      description:
        "The system appears to mix signing, encryption, and verification responsibilities across modules.",
      recommendation:
        "Document which modules sign, verify, encrypt, decrypt, or manage certificates before migration.",
      modules,
    });
  }

  return risks;
}