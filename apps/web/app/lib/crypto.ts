/**
 * Client-side encryption for backup bundles.
 *
 * The server stores whatever ciphertext it is given and never sees the
 * passphrase or the key (api/pft/models.EncryptedBackupBundle is salt + nonce +
 * ciphertext, all opaque). AES-256-GCM for the payload, PBKDF2-SHA-256 for key
 * derivation - both straight from WebCrypto, no dependencies.
 */

const PBKDF2_ITERATIONS = 310_000
const SALT_BYTES = 16
const NONCE_BYTES = 12

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptedPayload {
  salt: string
  nonce: string
  ciphertext: string
}

export async function encryptJson(payload: unknown, passphrase: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES))
  const key = await deriveKey(passphrase, salt)

  const plaintext = encoder.encode(JSON.stringify(payload))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    key,
    plaintext as BufferSource,
  )

  return {
    salt: toBase64(salt),
    nonce: toBase64(nonce),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  }
}

/** Throws on a wrong passphrase or tampered data - GCM authenticates. */
export async function decryptJson<T>(payload: EncryptedPayload, passphrase: string): Promise<T> {
  const key = await deriveKey(passphrase, fromBase64(payload.salt))
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.nonce) as BufferSource },
    key,
    fromBase64(payload.ciphertext) as BufferSource,
  )
  return JSON.parse(decoder.decode(plaintext)) as T
}
