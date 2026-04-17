import type { CryptoTouchpoint, PQCMigrationItem } from "@/types/report";

export function buildPqcMigrations(
  touchpoints: CryptoTouchpoint[]
): PQCMigrationItem[] {
  return touchpoints.map((item, index) => {
    let recommendedPqc = "Review crypto inventory";
    let action = "Document this touchpoint and plan phased migration.";

    if (/ECDSA|secp256k1|RSA/i.test(item.algorithm)) {
      recommendedPqc = "CRYSTALS-Dilithium or SPHINCS+";
      action =
        "Replace or wrap classical signing with PQC-safe signature options.";
    } else if (/TLS/i.test(item.algorithm)) {
      recommendedPqc = "Hybrid TLS with Kyber-style KEM support";
      action = "Plan hybrid TLS or PQC-ready handshake upgrades.";
    } else if (/AES/i.test(item.algorithm)) {
      recommendedPqc = "AES-256";
      action = "Increase symmetric key strength where needed.";
    } else if (/SHA|Keccak/i.test(item.algorithm)) {
      recommendedPqc = "Keep hashing, review usage context";
      action =
        "Verify hash usage is not standing in for vulnerable signature schemes.";
    }

    return {
      id: `${item.moduleId}-pqc-${index + 1}`,
      moduleId: item.moduleId,
      moduleName: item.moduleName,
      currentAlgorithm: item.algorithm,
      recommendedPqc,
      priority: item.severity,
      reason: item.reason,
      action,
    };
  });
}