export type CryptoPatternDefinition = {
  id: string;
  label: string;
  algorithm: string;
  family:
    | "public-key"
    | "signature"
    | "encryption"
    | "hash"
    | "integrity"
    | "certificate"
    | "token"
    | "key-management";
  severity: "High" | "Medium" | "Low";
  regex: RegExp;
  reason: string;
};

export const CRYPTO_PATTERNS: CryptoPatternDefinition[] = [
  {
    id: "rsa",
    label: "RSA",
    algorithm: "RSA",
    family: "public-key",
    severity: "High",
    regex:
      /\b(rsa|rsassa|rsa-oaep|pkcs#?1|pkcs1|openssl_rsa|node-rsa|rsacrypto|rsapublickey|rsaprivatekey)\b/i,
    reason: "RSA is vulnerable to quantum attacks.",
  },
  {
    id: "ecc",
    label: "ECC",
    algorithm: "ECC",
    family: "public-key",
    severity: "High",
    regex:
      /\b(ecc|ecdh|ecdsa|ed25519|curve25519|x25519|secp256k1|secp256r1|p-256|p256|elliptic)\b/i,
    reason: "Elliptic-curve cryptography is vulnerable to quantum attacks.",
  },
  {
    id: "dsa",
    label: "DSA / EdDSA",
    algorithm: "DSA/EdDSA",
    family: "signature",
    severity: "High",
    regex: /\b(dsa|eddsa)\b/i,
    reason: "Classical signature algorithms should be reviewed for PQC migration.",
  },
  {
    id: "aes",
    label: "AES",
    algorithm: "AES",
    family: "encryption",
    severity: "Medium",
    regex:
      /\b(aes(?:-128|-192|-256)?|rijndael|aesgcm|aes-cbc|aes_ctr|crypto\.createcipheriv|cipher\.getinstance)\b/i,
    reason: "Symmetric crypto is safer than public-key crypto but still needs review.",
  },
  {
    id: "des",
    label: "DES / 3DES",
    algorithm: "DES/3DES",
    family: "encryption",
    severity: "High",
    regex: /\b(des|3des|tripledes|desede)\b/i,
    reason: "Legacy encryption is weak and should be replaced.",
  },
  {
    id: "sha",
    label: "Hashing",
    algorithm: "Hash",
    family: "hash",
    severity: "Low",
    regex:
      /\b(sha1|sha-1|sha224|sha-224|sha256|sha-256|sha384|sha-384|sha512|sha-512|keccak|ripemd|blake2|blake3|hashlib|messagedigest)\b/i,
    reason: "Hashing should be inventoried as part of crypto discovery.",
  },
  {
    id: "hmac",
    label: "HMAC / MAC",
    algorithm: "HMAC/MAC",
    family: "integrity",
    severity: "Low",
    regex: /\b(hmac|mac\b)\b/i,
    reason: "Authentication primitives should be included in the cryptographic map.",
  },
  {
    id: "tls",
    label: "TLS / Certificates",
    algorithm: "TLS/X.509",
    family: "certificate",
    severity: "Medium",
    regex:
      /\b(tls|ssl|https|x509|x\.509|certificate|cert\b|keystore|truststore|pem\b|crt\b|jks\b|p12\b|pkcs12)\b/i,
    reason: "Certificate and TLS flows often depend on classical public-key crypto.",
  },
  {
    id: "jwt",
    label: "JWT / OAuth",
    algorithm: "JWT/OAuth",
    family: "token",
    severity: "Medium",
    regex: /\b(jwt|jws|jwe|bearer|oauth|openid|oidc)\b/i,
    reason: "Token flows often rely on classical signing and trust chains.",
  },
  {
    id: "kms",
    label: "KMS / Secrets",
    algorithm: "KMS/Secrets",
    family: "key-management",
    severity: "Medium",
    regex:
      /\b(kms|keyvault|vault|secretmanager|secret manager|aws_kms|azure key vault|google cloud kms)\b/i,
    reason: "Key lifecycle and storage matter for migration planning.",
  },
  {
    id: "signing",
    label: "Signing Flow",
    algorithm: "Signing",
    family: "signature",
    severity: "High",
    regex:
      /\b(sign|verify|signature|signed|createsign|createverify|signingkey|recoversigner|ecrecover)\b/i,
    reason: "Signing flows are important PQC migration targets.",
  },
  {
    id: "encryption-generic",
    label: "Encryption Flow",
    algorithm: "Encryption",
    family: "encryption",
    severity: "Medium",
    regex:
      /\b(encrypt|decrypt|cipher|decipher|sealed box|box\.seal|nacl\.box|crypto_box)\b/i,
    reason: "Encryption usage should be cataloged across all modules.",
  },
];