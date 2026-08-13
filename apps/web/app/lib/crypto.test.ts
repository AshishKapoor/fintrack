import { describe, expect, it } from 'vitest'
import { decryptJson, encryptJson, fromBase64, toBase64 } from './crypto'

describe('base64 helpers', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 255])
    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes))
  })
})

describe('encryptJson / decryptJson', () => {
  const secret = { accounts: [{ id: 1, name: 'Cash' }], note: 'ünïcode £€¥' }

  it('round-trips a payload with the right passphrase', async () => {
    const encrypted = await encryptJson(secret, 'correct horse battery staple')
    const decrypted = await decryptJson<typeof secret>(encrypted, 'correct horse battery staple')
    expect(decrypted).toEqual(secret)
  })

  it('produces different ciphertext each run (fresh salt and nonce)', async () => {
    const a = await encryptJson(secret, 'pass')
    const b = await encryptJson(secret, 'pass')
    expect(a.ciphertext).not.toEqual(b.ciphertext)
    expect(a.salt).not.toEqual(b.salt)
  })

  it('rejects a wrong passphrase', async () => {
    const encrypted = await encryptJson(secret, 'right')
    await expect(decryptJson(encrypted, 'wrong')).rejects.toThrow()
  })

  it('rejects tampered ciphertext - GCM authenticates', async () => {
    const encrypted = await encryptJson(secret, 'pass')
    const bytes = fromBase64(encrypted.ciphertext)
    bytes[0] ^= 0xff
    await expect(
      decryptJson({ ...encrypted, ciphertext: toBase64(bytes) }, 'pass'),
    ).rejects.toThrow()
  })
}, 30_000)
