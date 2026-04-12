import { QuantumRisk } from "@/types/quantum";

export function detectQuantumRisks(code: string): QuantumRisk[] {
  const risks: QuantumRisk[] = [];
  const lower = code.toLowerCase();

  function push(risk: QuantumRisk) {
    risks.push(risk);
  }

  if (lower.includes("ecrecover")) {
    push({
      id: "ecdsa-dependence",
      title: "ECDSA signature dependence",
      severity: "High",
      description:
        "ECDSA signatures can be broken by quantum computers (Shor’s algorithm).",
      recommendation:
        "Plan migration to post-quantum signature schemes (e.g. lattice-based).",
    });
  }

  if (lower.includes("signature") || lower.includes("verify")) {
    push({
      id: "signature-dependence",
      title: "Signature-based authentication",
      severity: "High",
      description:
        "Authentication relying on signatures may become insecure under quantum attacks.",
      recommendation:
        "Introduce crypto-agility to swap signature schemes in future.",
    });
  }

  if (
    lower.includes("owner") ||
    lower.includes("admin") ||
    lower.includes("onlyowner")
  ) {
    push({
      id: "centralized-signer",
      title: "Centralized admin/signer risk",
      severity: "Medium",
      description:
        "Single key control becomes a major risk if quantum attacks compromise keys.",
      recommendation:
        "Use multi-sig or distributed key control.",
    });
  }

  if (
    !lower.includes("rotate") &&
    !lower.includes("migration") &&
    !lower.includes("upgrade")
  ) {
    push({
      id: "no-crypto-agility",
      title: "No crypto agility",
      severity: "High",
      description:
        "No visible way to upgrade cryptographic primitives in the future.",
      recommendation:
        "Design upgradeable cryptographic modules.",
    });
  }

  if (lower.includes("oracle") || lower.includes("bridge")) {
    push({
      id: "external-trust",
      title: "External dependency risk (oracle/bridge)",
      severity: "Medium",
      description:
        "External systems may break under quantum attacks or introduce weak trust assumptions.",
      recommendation:
        "Validate and harden external dependencies.",
    });
  }

  if (!lower.includes("upgrade") && !lower.includes("proxy")) {
    push({
      id: "no-upgradeability",
      title: "No upgrade mechanism",
      severity: "High",
      description:
        "System cannot be easily upgraded to post-quantum cryptography.",
      recommendation:
        "Introduce upgradeable architecture (proxy pattern).",
    });
  }

  return risks;
}