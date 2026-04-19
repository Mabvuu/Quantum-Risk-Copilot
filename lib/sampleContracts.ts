export const vulnerableSampleContract = `# Payment Gateway Service
SERVICE_NAME=payments-api
TLS_ENABLED=true
TLS_VERSION=TLS1.0
VERIFY_CERT=false

JWT_SIGNING_ALG=RS256
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----demo-private-key-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY_PATH="./keys/jwt-public.pem"

DATABASE_ENCRYPTION=AES-128-CBC
PASSWORD_RESET_TOKEN_SECRET="reset-secret-123"
API_KEY="demo-api-key"

import crypto from "crypto";
import jwt from "jsonwebtoken";
import fs from "fs";

const privateKey = process.env.JWT_PRIVATE_KEY || "hardcoded-private-key";
const cert = fs.readFileSync("./certs/server.pem", "utf8");

export function signUserToken(payload: object) {
  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}

export function encryptCardData(cardNumber: string) {
  const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.alloc(16), Buffer.alloc(16));
  return cipher.update(cardNumber, "utf8", "hex") + cipher.final("hex");
}

export function insecureRandomId() {
  return Math.random().toString(36).slice(2);
}

export function connectGateway() {
  return {
    https: true,
    rejectUnauthorized: false,
    cert,
  };
}
`;

export const saferSampleContract = `# Identity and Signing Service
SERVICE_NAME=identity-service
TLS_ENABLED=true
TLS_VERSION=TLS1.3
VERIFY_CERT=true

JWT_SIGNING_ALG=EdDSA
KMS_PROVIDER=cloud-kms
JWT_PRIVATE_KEY_REF="kms://identity/signing-key"
TRUSTSTORE_PATH="./trust/production-truststore.pem"

import fs from "fs";

type SessionPayload = {
  userId: string;
  role: string;
};

export async function issueSession(payload: SessionPayload) {
  return {
    status: "issued",
    algorithm: "managed-signing-service",
    keySource: "cloud-kms",
    payload,
  };
}

export async function verifyIncomingCertificate() {
  const trustStore = fs.readFileSync("./trust/production-truststore.pem", "utf8");

  return {
    verified: true,
    trustStoreLoaded: Boolean(trustStore),
    tlsVersion: "TLS1.3",
  };
}

export async function encryptSensitiveRecord() {
  return {
    mode: "AES-256-GCM",
    keySource: "managed-kms",
    rotation: "enabled",
  };
}

export function auditCryptoInventory() {
  return [
    "managed signing",
    "trust store validation",
    "AES-256-GCM encryption",
    "centralized key lifecycle",
  ];
}
`;