import {
  CryptoTouchpoint,
  CryptoTouchpointType,
  Severity,
} from "@/types/report";

type CryptoPattern = {
  id: string;
  regex: RegExp;
  rawType: string;
  algorithm: string;
  severity: Severity;
  usage: string;
  reason: string;
};

function toCryptoTouchpointType(value: string): CryptoTouchpointType {
  return value as unknown as CryptoTouchpointType;
}

function buildPatterns(moduleName: string): CryptoPattern[] {
  return [
    {
      id: "rsa",
      regex:
        /\b(rsa|rsassa|rsa-oaep|pkcs#?1|pkcs1|openssl_rsa|node-rsa|rsacrypto|rsapublickey|rsaprivatekey)\b/i,
      rawType: "public-key",
      algorithm: "RSA",
      severity: "High",
      usage: `${moduleName} appears to use RSA or RSA-based tooling`,
      reason: "RSA is vulnerable to quantum attacks and should be migrated to PQC.",
    },
    {
      id: "ecc",
      regex:
        /\b(ecc|ecdh|ecdsa|ed25519|curve25519|x25519|secp256k1|secp256r1|p-256|p256|elliptic)\b/i,
      rawType: "public-key",
      algorithm: "ECC",
      severity: "High",
      usage: `${moduleName} appears to use elliptic-curve cryptography`,
      reason: "ECC is vulnerable to quantum attacks and should be reviewed for PQC migration.",
    },
    {
      id: "dsa",
      regex: /\b(dsa|eddsa)\b/i,
      rawType: "signature",
      algorithm: "DSA/EdDSA",
      severity: "High",
      usage: `${moduleName} appears to use digital signature algorithms`,
      reason: "Classical digital signatures should be reviewed for post-quantum migration.",
    },
    {
      id: "aes",
      regex:
        /\b(aes(?:-128|-192|-256)?|rijndael|aesgcm|aes-cbc|aes_ctr|crypto\.createcipheriv|cipher\.getinstance)\b/i,
      rawType: "encryption",
      algorithm: "AES",
      severity: "Medium",
      usage: `${moduleName} appears to use symmetric encryption`,
      reason: "Symmetric encryption is less affected than public-key crypto, but key size and mode should still be reviewed.",
    },
    {
      id: "des",
      regex: /\b(des|3des|tripledes|desede)\b/i,
      rawType: "encryption",
      algorithm: "DES/3DES",
      severity: "High",
      usage: `${moduleName} appears to use legacy symmetric encryption`,
      reason: "Legacy encryption is weak even before quantum risk and should be replaced.",
    },
    {
      id: "sha",
      regex:
        /\b(sha1|sha-1|sha224|sha-224|sha256|sha-256|sha384|sha-384|sha512|sha-512|keccak|ripemd|blake2|blake3|hashlib|messageDigest)\b/i,
      rawType: "hash",
      algorithm: "Hashing",
      severity: "Low",
      usage: `${moduleName} appears to use hashing functions`,
      reason: "Hashing is less impacted than public-key crypto, but it is still part of the cryptographic inventory.",
    },
    {
      id: "hmac",
      regex: /\b(hmac|mac\b)\b/i,
      rawType: "integrity",
      algorithm: "HMAC/MAC",
      severity: "Low",
      usage: `${moduleName} appears to use message authentication`,
      reason: "Authentication primitives should be inventoried as part of crypto discovery.",
    },
    {
      id: "tls",
      regex:
        /\b(tls|ssl|https|x509|x\.509|certificate|cert\b|keystore|truststore|pem\b|crt\b|jks\b|p12\b|pkcs12)\b/i,
      rawType: "certificate",
      algorithm: "TLS/X.509",
      severity: "Medium",
      usage: `${moduleName} appears to use certificates, TLS, or trust material`,
      reason: "Certificate chains and TLS handshakes often depend on classical public-key cryptography.",
    },
    {
      id: "jwt",
      regex: /\b(jwt|jws|jwe|bearer|oauth|openid|oidc)\b/i,
      rawType: "token",
      algorithm: "JWT/OAuth",
      severity: "Medium",
      usage: `${moduleName} appears to use tokens or signed identity flows`,
      reason: "Signed token flows often depend on classical signing algorithms and key material.",
    },
    {
      id: "kms",
      regex:
        /\b(kms|keyvault|vault|secretmanager|secret manager|aws_kms|azure key vault|google cloud kms)\b/i,
      rawType: "key-management",
      algorithm: "KMS/Secrets",
      severity: "Medium",
      usage: `${moduleName} appears to use key management or secret storage`,
      reason: "Key storage and lifecycle are important for quantum migration planning.",
    },
    {
      id: "signing",
      regex:
        /\b(sign|verify|signature|signed|createSign|createVerify|SigningKey|recoverSigner|ecrecover)\b/i,
      rawType: "signature",
      algorithm: "Signing",
      severity: "High",
      usage: `${moduleName} appears to use signing or signature verification`,
      reason: "Classical signature flows should be identified for future PQC migration.",
    },
    {
      id: "encryption-generic",
      regex:
        /\b(encrypt|decrypt|cipher|decipher|sealed box|box\.seal|nacl\.box|crypto_box)\b/i,
      rawType: "encryption",
      algorithm: "Encryption",
      severity: "Medium",
      usage: `${moduleName} appears to use encryption/decryption flows`,
      reason: "Encryption usage should be cataloged to understand quantum migration impact.",
    },
    {
      id: "key-material",
      regex:
        /\b(private[_-]?key|public[_-]?key|secret[_-]?key|api[_-]?key|client[_-]?secret|signing[_-]?key|encryption[_-]?key|mnemonic|seed phrase|keystore)\b/i,
      rawType: "key-management",
      algorithm: "Key Material",
      severity: "High",
      usage: `${moduleName} appears to reference sensitive key material`,
      reason: "Key usage and storage clues are critical when mapping cryptographic risk.",
    },
  ];
}

export function detectCryptoTouchpoints(
  code: string,
  moduleId: string,
  moduleName: string
): CryptoTouchpoint[] {
  const touchpoints: CryptoTouchpoint[] = [];
  const patterns = buildPatterns(moduleName);

  patterns.forEach((pattern, index) => {
    if (pattern.regex.test(code)) {
      touchpoints.push({
        id: `${moduleId}-${pattern.id}-${index}`,
        moduleId,
        moduleName,
        type: toCryptoTouchpointType(pattern.rawType),
        algorithm: pattern.algorithm,
        severity: pattern.severity,
        usage: pattern.usage,
        reason: pattern.reason,
      });
    }
  });

  return touchpoints;
}