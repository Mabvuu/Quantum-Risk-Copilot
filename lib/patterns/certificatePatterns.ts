export type CertificatePatternDefinition = {
  id: string;
  label: string;
  category:
    | "certificate"
    | "trust-store"
    | "tls"
    | "mutual-tls"
    | "ca"
    | "keystore";
  severity: "High" | "Medium" | "Low";
  regex: RegExp;
  reason: string;
};

export const CERTIFICATE_PATTERNS: CertificatePatternDefinition[] = [
  {
    id: "x509-reference",
    label: "X.509 certificate reference",
    category: "certificate",
    severity: "Medium",
    regex: /\b(x509|x\.509|certificate|cert\b|client cert|server cert)\b/i,
    reason: "Certificate usage may rely on classical public-key algorithms.",
  },
  {
    id: "pem-crt-files",
    label: "PEM / CRT certificate file reference",
    category: "certificate",
    severity: "Medium",
    regex: /\b(pem|crt|cer|der|ca\.pem|cert\.pem|fullchain\.pem)\b/i,
    reason: "Certificate file references indicate trust material and handshake dependencies.",
  },
  {
    id: "pkcs-keystore",
    label: "PKCS12 / JKS keystore reference",
    category: "keystore",
    severity: "Medium",
    regex: /\b(pkcs12|p12|jks|keystore|truststore)\b/i,
    reason: "Keystores and truststores often hold certificate and key material.",
  },
  {
    id: "tls-ssl-reference",
    label: "TLS / SSL reference",
    category: "tls",
    severity: "Medium",
    regex: /\b(tls|ssl|https|tlsConfig|sslContext|secureContext)\b/i,
    reason: "TLS/SSL flows should be mapped because they often depend on classical crypto.",
  },
  {
    id: "mtls-reference",
    label: "Mutual TLS reference",
    category: "mutual-tls",
    severity: "High",
    regex: /\b(mtls|mutual tls|client authentication|clientAuth|requireClientCert)\b/i,
    reason: "mTLS adds certificate dependencies on both sides of the connection.",
  },
  {
    id: "ca-reference",
    label: "CA / trust anchor reference",
    category: "ca",
    severity: "Medium",
    regex: /\b(ca\b|certificate authority|root cert|intermediate cert|trust anchor|caFile|ca_path)\b/i,
    reason: "CA and trust-anchor references reveal certificate chain dependencies.",
  },
  {
    id: "java-cert-apis",
    label: "Java certificate APIs",
    category: "certificate",
    severity: "Medium",
    regex: /\b(X509Certificate|KeyStore|TrustManager|TrustManagerFactory|SSLContext)\b/i,
    reason: "Java certificate APIs indicate certificate loading and validation flows.",
  },
  {
    id: "dotnet-cert-apis",
    label: ".NET certificate APIs",
    category: "certificate",
    severity: "Medium",
    regex: /\b(X509Certificate2|X509Store|SslStream|HttpClientHandler)\b/i,
    reason: ".NET certificate APIs indicate TLS or certificate handling.",
  },
];