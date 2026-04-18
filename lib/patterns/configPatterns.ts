export type ConfigPatternDefinition = {
  id: string;
  label: string;
  category:
    | "config"
    | "certificate"
    | "protocol"
    | "key-management"
    | "token"
    | "encryption";
  severity: "High" | "Medium" | "Low";
  regex: RegExp;
  reason: string;
};

export const CONFIG_PATTERNS: ConfigPatternDefinition[] = [
  {
    id: "env-secret",
    label: "Environment secret reference",
    category: "key-management",
    severity: "Medium",
    regex:
      /\b(process\.env\.[A-Z0-9_]*(SECRET|KEY|TOKEN|CERT|PASSWORD)|dotenv|ENV\[["'][A-Z0-9_]+["']\])\b/i,
    reason: "Environment config may point to keys, tokens, or trust material.",
  },
  {
    id: "yaml-tls",
    label: "TLS or certificate config",
    category: "certificate",
    severity: "Medium",
    regex:
      /\b(tls|ssl|https|certificate|cert_file|certfile|keyfile|ca_file|caFile|truststore|keystore|pem|crt|p12|jks)\b/i,
    reason: "Config appears to reference certificates or TLS settings.",
  },
  {
    id: "cipher-config",
    label: "Cipher or encryption config",
    category: "encryption",
    severity: "Medium",
    regex:
      /\b(cipher|ciphers|algorithm|aes|rsa|ecdsa|ecdh|curve|sha256|sha512|hmac)\b/i,
    reason: "Config may define cryptographic algorithms or protocol settings.",
  },
  {
    id: "jwt-config",
    label: "JWT or token config",
    category: "token",
    severity: "Medium",
    regex:
      /\b(jwt|jws|jwe|issuer|audience|bearer|oauth|openid|oidc|signingKey|jwks)\b/i,
    reason: "Token config often implies signing and trust-chain dependencies.",
  },
  {
    id: "kms-config",
    label: "KMS or secrets manager config",
    category: "key-management",
    severity: "Medium",
    regex:
      /\b(kms|keyvault|vault|secretmanager|secretsmanager|aws_kms|azure key vault|google cloud kms)\b/i,
    reason: "Key lifecycle and storage clues matter for migration planning.",
  },
  {
    id: "protocol-config",
    label: "Protocol or transport security config",
    category: "protocol",
    severity: "Low",
    regex:
      /\b(protocol|handshake|mtls|mutual tls|secureTransport|transportSecurity|trustManager|hostnameVerifier)\b/i,
    reason: "Transport-level config may reveal certificate and crypto dependencies.",
  },
];