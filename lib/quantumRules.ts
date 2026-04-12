import { QuantumRisk } from "@/types/quantum";

function findLineInfo(code: string, matcher: (line: string) => boolean) {
  const lines = code.split("\n");

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    if (matcher(line)) {
      return {
        line: index + 1,
        snippet: line.trim(),
      };
    }
  }

  return {
    line: undefined,
    snippet: undefined,
  };
}

export function detectQuantumRisks(code: string): QuantumRisk[] {
  const risks: QuantumRisk[] = [];

  function pushRisk(
    risk: Omit<QuantumRisk, "line" | "snippet">,
    matcher?: RegExp
  ) {
    if (risks.some((item) => item.id === risk.id)) return;

    const info = matcher
      ? findLineInfo(code, (line) => matcher.test(line))
      : { line: undefined, snippet: undefined };

    risks.push({
      ...risk,
      line: info.line,
      snippet: info.snippet,
    });
  }

  if (/\becrecover\b/i.test(code)) {
    pushRisk(
      {
        id: "ecdsa-dependence",
        title: "ECDSA signature dependence",
        severity: "High",
        description:
          "This module uses ECDSA-style signature recovery. Long-term, that becomes a serious risk under quantum attacks.",
        recommendation:
          "Plan migration toward post-quantum-safe authentication or crypto-agile verification layers.",
      },
      /\becrecover\b/i
    );
  }

  if (
    /\b(signature|signer|signed|verify|verification|ecdsa|permit\s*\()\b/i.test(
      code
    )
  ) {
    pushRisk(
      {
        id: "signature-based-auth",
        title: "Signature-based authentication",
        severity: "High",
        description:
          "The module appears to depend on signature verification or signer trust. That can become unsafe if current signature schemes are broken.",
        recommendation:
          "Add crypto-agility so the verification method can be upgraded later without redesigning the whole system.",
      },
      /\b(signature|signer|signed|verify|verification|ecdsa|permit\s*\()\b/i
    );
  }

  if (/\b(owner|admin|onlyowner|onlyrole|accesscontrol)\b/i.test(code)) {
    pushRisk(
      {
        id: "centralized-admin-key",
        title: "Centralized admin or signer risk",
        severity: "Medium",
        description:
          "This module appears to rely on privileged accounts or admin-controlled paths. That becomes more dangerous if key security weakens over time.",
        recommendation:
          "Reduce single-key dependency with stronger admin separation, multisig, or distributed controls.",
      },
      /\b(owner|admin|onlyowner|onlyrole|accesscontrol)\b/i
    );
  }

  if (
    !/\b(rotate|rotation|migrate|migration|crypto-agility|algorithm|scheme upgrade)\b/i.test(
      code
    )
  ) {
    pushRisk({
      id: "no-crypto-agility",
      title: "No visible crypto agility",
      severity: "High",
      description:
        "There is no obvious sign that the cryptographic approach can be rotated or replaced later.",
      recommendation:
        "Design the verification/authentication layer so cryptographic primitives can be swapped in future.",
    });
  }

  if (/\b(oracle|bridge|relayer|cross-chain|cross chain)\b/i.test(code)) {
    pushRisk(
      {
        id: "external-cryptographic-dependency",
        title: "External trust dependency",
        severity: "Medium",
        description:
          "This module appears tied to bridges, relayers, or other external trust points. Those paths can amplify cryptographic and coordination risk.",
        recommendation:
          "Review every external trust boundary and document how failures or weak signatures are handled.",
      },
      /\b(oracle|bridge|relayer|cross-chain|cross chain)\b/i
    );
  }

  if (!/\b(upgrade|upgradable|upgradeable|proxy|initializer)\b/i.test(code)) {
    pushRisk({
      id: "no-upgrade-path",
      title: "No visible upgrade path",
      severity: "High",
      description:
        "There is no obvious upgrade mechanism, which makes future migration to safer cryptography harder.",
      recommendation:
        "Add a controlled upgrade path or modular replacement strategy for critical cryptographic logic.",
    });
  }

  if (/\b(keccak256|sha256|merkle)\b/i.test(code)) {
    pushRisk(
      {
        id: "hash-heavy-security-assumption",
        title: "Hash-based security dependency",
        severity: "Low",
        description:
          "This module depends on hash-based logic or integrity checks. That is not an immediate break here, but cryptographic assumptions should still be documented clearly.",
        recommendation:
          "Document where hashes are used for trust, proof, or validation so migration planning is easier later.",
      },
      /\b(keccak256|sha256|merkle)\b/i
    );
  }

  return risks;
}