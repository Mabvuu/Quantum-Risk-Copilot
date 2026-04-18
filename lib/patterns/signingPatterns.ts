export type SigningPatternDefinition = {
  id: string;
  label: string;
  category:
    | "signing"
    | "verification"
    | "wallet-signing"
    | "message-signing"
    | "transaction-signing";
  severity: "High" | "Medium" | "Low";
  regex: RegExp;
  reason: string;
};

export const SIGNING_PATTERNS: SigningPatternDefinition[] = [
  {
    id: "generic-sign",
    label: "Generic signing call",
    category: "signing",
    severity: "High",
    regex: /\b(sign|createSign|SigningKey|signData|signPayload|signDigest)\b/i,
    reason: "Signing flows are high-priority PQC migration targets.",
  },
  {
    id: "generic-verify",
    label: "Generic verification call",
    category: "verification",
    severity: "Medium",
    regex: /\b(verify|createVerify|verifySignature|verifySignedMessage)\b/i,
    reason: "Verification paths must be mapped together with signing flows.",
  },
  {
    id: "wallet-signing",
    label: "Wallet signing flow",
    category: "wallet-signing",
    severity: "High",
    regex: /\b(signMessage|signTypedData|wallet\.sign|ethers\.Wallet|web3\.eth\.accounts)\b/i,
    reason: "Wallet-based signing often depends on classical elliptic-curve signatures.",
  },
  {
    id: "transaction-signing",
    label: "Transaction signing flow",
    category: "transaction-signing",
    severity: "High",
    regex: /\b(signTransaction|sendSignedTransaction|rawTransaction|serializeTransaction)\b/i,
    reason: "Transaction signing is a core cryptographic dependency in blockchain systems.",
  },
  {
    id: "solidity-recovery",
    label: "Solidity signature recovery",
    category: "verification",
    severity: "High",
    regex: /\b(ecrecover|recoverSigner|toEthSignedMessageHash)\b/i,
    reason: "Signature recovery shows verification dependencies on classical crypto.",
  },
  {
    id: "openssl-signing",
    label: "OpenSSL signing or verification",
    category: "signing",
    severity: "High",
    regex: /\b(openssl_sign|openssl_verify)\b/i,
    reason: "OpenSSL signing APIs indicate certificate or classical signature flows.",
  },
  {
    id: "jwt-signing",
    label: "JWT signing or verification",
    category: "message-signing",
    severity: "Medium",
    regex: /\b(jwt\.sign|jwt\.verify|Jwts\.builder|Jwts\.parser|jsonwebtoken)\b/i,
    reason: "JWT signing flows often rely on classical signing algorithms.",
  },
  {
    id: "cloud-signing",
    label: "KMS or cloud signing",
    category: "signing",
    severity: "Medium",
    regex: /\b(signing service|kms sign|asymmetricSign|SignRequest|KeyVaultSign)\b/i,
    reason: "Cloud signing services still need algorithm inventory and migration planning.",
  },
];