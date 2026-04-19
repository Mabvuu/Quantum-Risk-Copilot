import type { SystemModuleInput } from "@/types/report";

export type SampleSystem = {
  systemName: string;
  architectureNotes: string;
  touchpoints: string[];
  modules: SystemModuleInput[];
};

export const singleModuleSampleSystem: SampleSystem = {
  systemName: "Identity Signing Service",
  architectureNotes:
    "Single-module sample focused on language-agnostic cryptography discovery across signing, certificates, secrets, and encryption.",
  touchpoints: ["jwt signing", "certificate validation", "data encryption"],
  modules: [
    {
      id: "module-sample-1",
      name: "identity-service.ts",
      code: `import crypto from "crypto";
import jwt from "jsonwebtoken";
import fs from "fs";

const signingKey = process.env.JWT_PRIVATE_KEY || "hardcoded-private-key";
const certificate = fs.readFileSync("./certs/server.pem", "utf8");

export function issueToken(payload: object) {
  return jwt.sign(payload, signingKey, { algorithm: "RS256" });
}

export function encryptProfile(data: string) {
  const cipher = crypto.createCipheriv(
    "aes-128-cbc",
    Buffer.alloc(16),
    Buffer.alloc(16)
  );

  return cipher.update(data, "utf8", "hex") + cipher.final("hex");
}

export function connectSecureClient() {
  return {
    tls: true,
    rejectUnauthorized: false,
    cert: certificate,
  };
}
`,
    },
  ],
};

export const multiModuleSampleSystem: SampleSystem = {
  systemName: "Payments and Identity Platform",
  architectureNotes:
    "Multi-module sample showing API signing, certificate trust, token flows, encryption, and secret handling across different services.",
  touchpoints: [
    "jwt signing",
    "api auth",
    "tls certificates",
    "kms",
    "data encryption",
  ],
  modules: [
    {
      id: "module-sample-1",
      name: "payments-api.ts",
      code: `import crypto from "crypto";

const apiKey = "demo-api-key";
const clientSecret = "demo-client-secret";

export function encryptCard(cardNumber: string) {
  const cipher = crypto.createCipheriv(
    "aes-128-cbc",
    Buffer.alloc(16),
    Buffer.alloc(16)
  );

  return cipher.update(cardNumber, "utf8", "hex") + cipher.final("hex");
}

export function buildGatewayConfig() {
  return {
    protocol: "https",
    tlsVersion: "TLS1.0",
    rejectUnauthorized: false,
    apiKey,
    clientSecret,
  };
}
`,
    },
    {
      id: "module-sample-2",
      name: "identity-service.py",
      code: `import jwt
import hashlib

JWT_PRIVATE_KEY = "hardcoded-private-key"

def issue_session(payload):
    return jwt.encode(payload, JWT_PRIVATE_KEY, algorithm="RS256")

def fingerprint(value: str):
    return hashlib.sha256(value.encode()).hexdigest()
`,
    },
    {
      id: "module-sample-3",
      name: "gateway-config.yaml",
      code: `tls: true
ssl: true
certificate: ./certs/server.pem
truststore: ./trust/production-truststore.pem
signingKey: kms://platform/signing-key
jwtAlgorithm: RS256
cipher: AES-256-GCM
`,
    },
  ],
};