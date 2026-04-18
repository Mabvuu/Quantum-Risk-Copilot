export type LibraryPatternDefinition = {
  id: string;
  ecosystem:
    | "javascript"
    | "typescript"
    | "python"
    | "java"
    | "csharp"
    | "go"
    | "rust"
    | "php"
    | "ruby"
    | "solidity"
    | "generic";
  library: string;
  category:
    | "public-key"
    | "signature"
    | "encryption"
    | "hash"
    | "certificate"
    | "key-management"
    | "wallet"
    | "token";
  severity: "High" | "Medium" | "Low";
  regex: RegExp;
  reason: string;
};

export const LIBRARY_PATTERNS: LibraryPatternDefinition[] = [
  {
    id: "node-crypto",
    ecosystem: "javascript",
    library: "crypto",
    category: "encryption",
    severity: "Medium",
    regex: /\b(require\(["']crypto["']\)|from ["']crypto["']|crypto\.)/i,
    reason: "Node crypto usage can expose encryption, hashing, and key handling.",
  },
  {
    id: "webcrypto",
    ecosystem: "javascript",
    library: "Web Crypto API",
    category: "encryption",
    severity: "Medium",
    regex: /\b(window\.crypto|crypto\.subtle|subtle\.encrypt|subtle\.sign)\b/i,
    reason: "Web Crypto usage should be inventoried for crypto dependencies.",
  },
  {
    id: "ethers",
    ecosystem: "javascript",
    library: "ethers",
    category: "wallet",
    severity: "High",
    regex: /\b(from ["']ethers["']|require\(["']ethers["']\)|ethers\.Wallet|SigningKey)\b/i,
    reason: "Wallet and signing libraries often imply classical signature usage.",
  },
  {
    id: "web3js",
    ecosystem: "javascript",
    library: "web3",
    category: "wallet",
    severity: "High",
    regex: /\b(from ["']web3["']|require\(["']web3["']\)|new Web3\(|web3\.eth\.accounts)\b/i,
    reason: "Web3 account tooling often implies key and signature handling.",
  },
  {
    id: "tweetnacl",
    ecosystem: "javascript",
    library: "tweetnacl",
    category: "public-key",
    severity: "High",
    regex: /\b(from ["']tweetnacl["']|require\(["']tweetnacl["']\)|nacl\.)/i,
    reason: "TweetNaCl usage usually means encryption or signing primitives are present.",
  },
  {
    id: "py-cryptography",
    ecosystem: "python",
    library: "cryptography",
    category: "certificate",
    severity: "Medium",
    regex: /\bfrom cryptography\b|\bimport cryptography\b|\bcryptography\.hazmat\b/i,
    reason: "Python cryptography package indicates direct cryptographic handling.",
  },
  {
    id: "py-hashlib",
    ecosystem: "python",
    library: "hashlib",
    category: "hash",
    severity: "Low",
    regex: /\bimport hashlib\b|\bhashlib\./i,
    reason: "Hash usage should be tracked as part of crypto discovery.",
  },
  {
    id: "py-pyjwt",
    ecosystem: "python",
    library: "PyJWT",
    category: "token",
    severity: "Medium",
    regex: /\bimport jwt\b|\bfrom jwt\b|\bjwt\./i,
    reason: "JWT libraries often depend on classical signing flows.",
  },
  {
    id: "java-security",
    ecosystem: "java",
    library: "java.security",
    category: "public-key",
    severity: "High",
    regex: /\bimport java\.security\b|\bKeyPairGenerator\b|\bSignature\b|\bMessageDigest\b/i,
    reason: "Java security APIs may expose core crypto algorithms and key flows.",
  },
  {
    id: "java-javax-crypto",
    ecosystem: "java",
    library: "javax.crypto",
    category: "encryption",
    severity: "Medium",
    regex: /\bimport javax\.crypto\b|\bCipher\b|\bSecretKey\b/i,
    reason: "Java encryption usage should be included in the system inventory.",
  },
  {
    id: "dotnet-crypto",
    ecosystem: "csharp",
    library: "System.Security.Cryptography",
    category: "public-key",
    severity: "High",
    regex: /\busing System\.Security\.Cryptography\b|\bRSA\b|\bECDsa\b|\bAes\b/i,
    reason: ".NET crypto APIs can expose key generation, signing, and encryption.",
  },
  {
    id: "go-crypto",
    ecosystem: "go",
    library: "Go crypto",
    category: "public-key",
    severity: "High",
    regex: /\bimport\s+"crypto\/(rsa|ecdsa|elliptic|tls|x509|aes|sha256)"\b/i,
    reason: "Go crypto packages show direct cryptographic dependencies.",
  },
  {
    id: "rust-ring",
    ecosystem: "rust",
    library: "ring",
    category: "signature",
    severity: "High",
    regex: /\buse ring::|\bring::signature\b|\bring::aead\b/i,
    reason: "Rust ring usage indicates cryptographic operations worth inventorying.",
  },
  {
    id: "rust-openssl",
    ecosystem: "rust",
    library: "openssl",
    category: "certificate",
    severity: "Medium",
    regex: /\buse openssl::|\bopenssl::rsa\b|\bopenssl::x509\b/i,
    reason: "OpenSSL bindings often imply certificate and classical key dependencies.",
  },
  {
    id: "php-openssl",
    ecosystem: "php",
    library: "OpenSSL",
    category: "certificate",
    severity: "Medium",
    regex: /\bopenssl_(encrypt|decrypt|sign|verify|pkey_get_private|pkey_get_public)\b/i,
    reason: "PHP OpenSSL usage indicates encryption, signing, or certificate flows.",
  },
  {
    id: "ruby-openssl",
    ecosystem: "ruby",
    library: "OpenSSL",
    category: "certificate",
    severity: "Medium",
    regex: /\brequire ["']openssl["']|\bOpenSSL::(PKey|Cipher|Digest|X509)\b/i,
    reason: "Ruby OpenSSL usage indicates classical crypto dependencies.",
  },
  {
    id: "solidity-ecrecover",
    ecosystem: "solidity",
    library: "Solidity crypto primitives",
    category: "signature",
    severity: "High",
    regex: /\becrecover\b|\bkeccak256\b|\babi\.encodePacked\b/i,
    reason: "Solidity signature recovery implies public-key and signing dependencies.",
  },
  {
    id: "generic-openssl",
    ecosystem: "generic",
    library: "OpenSSL",
    category: "certificate",
    severity: "Medium",
    regex: /\bopenssl\b/i,
    reason: "OpenSSL references usually mean certificate or classical crypto usage.",
  },
];