export type KeyUsagePatternDefinition = {
  id: string;
  label: string;
  category:
    | "key-generation"
    | "key-storage"
    | "key-loading"
    | "signing"
    | "verification"
    | "secret-reference";
  severity: "High" | "Medium" | "Low";
  regex: RegExp;
  reason: string;
};

export const KEY_USAGE_PATTERNS: KeyUsagePatternDefinition[] = [
  {
    id: "hardcoded-private-key",
    label: "Hardcoded private key or secret",
    category: "key-storage",
    severity: "High",
    regex:
      /\b(private[_-]?key|secret[_-]?key|client[_-]?secret|api[_-]?key|password|mnemonic|seed phrase)\b\s*[:=]\s*["'`]/i,
    reason: "Hardcoded secrets or private key material are high risk.",
  },
  {
    id: "public-private-key-reference",
    label: "Public/private key reference",
    category: "key-loading",
    severity: "Medium",
    regex:
      /\b(public[_-]?key|private[_-]?key|signing[_-]?key|encryption[_-]?key|verification[_-]?key)\b/i,
    reason: "Key references help map cryptographic touchpoints.",
  },
  {
    id: "keypair-generation",
    label: "Key pair generation",
    category: "key-generation",
    severity: "High",
    regex:
      /\b(generateKeyPair|KeyPairGenerator|genrsa|crypto\.generateKeyPair|new Wallet\(|SigningKey|createECDH)\b/i,
    reason: "Key generation shows where classical algorithms enter the system.",
  },
  {
    id: "key-import-load",
    label: "Key import or load",
    category: "key-loading",
    severity: "Medium",
    regex:
      /\b(importKey|loadPrivateKey|loadPublicKey|readFile.*pem|pkey_get_private|pkey_get_public|fromPem|parsePrivateKey)\b/i,
    reason: "Imported keys show where trust material is loaded into the system.",
  },
  {
    id: "signature-use",
    label: "Signing operation",
    category: "signing",
    severity: "High",
    regex:
      /\b(sign|createSign|SigningKey|wallet\.sign|signMessage|signTypedData|openssl_sign)\b/i,
    reason: "Signing operations are priority targets for PQC migration.",
  },
  {
    id: "verify-use",
    label: "Signature verification",
    category: "verification",
    severity: "Medium",
    regex:
      /\b(verify|createVerify|verifyMessage|verifyTypedData|ecrecover|openssl_verify)\b/i,
    reason: "Verification paths must be mapped alongside signing flows.",
  },
  {
    id: "keystore-wallet",
    label: "Keystore or wallet reference",
    category: "key-storage",
    severity: "Medium",
    regex:
      /\b(keystore|truststore|wallet|seed|mnemonic|pkcs12|jks|pem|crt|p12)\b/i,
    reason: "Keystores and wallet files indicate stored cryptographic material.",
  },
  {
    id: "secret-manager-reference",
    label: "Secret manager reference",
    category: "secret-reference",
    severity: "Medium",
    regex:
      /\b(vault|keyvault|kms|secretmanager|secretsmanager|getSecret|accessSecretVersion)\b/i,
    reason: "Secret storage references help trace key lifecycle and storage.",
  },
];