/**
 * @darklock/crypto - Sharing & Key Envelope
 * 
 * Encrypts item/content keys for sharing with other users using
 * X25519 key exchange + XChaCha20-Poly1305.
 * 
 * Pattern: sender generates ephemeral X25519 keypair, computes shared
 * secret with recipient's public key, encrypts the item key, and sends
 * the ephemeral public key + ciphertext. Recipient reconstructs the
 * shared secret using their private key + the ephemeral public key.
 */

import { getSodium } from './sodium.js';
import type { Bytes, Base64String, SharedKeyEnvelope } from './types.js';

/**
 * Create a shared key envelope — encrypts an item/content key for a recipient.
 * 
 * Uses X25519 (crypto_box_seal pattern with manual ephemeral key for
 * associatedData binding).
 */
export async function createShareEnvelope(
  itemKey: Bytes,
  recipientPublicKey: Bytes,
  metadata: {
    shareId: string;
    senderId: string;
    recipientId: string;
    targetId: string;
    targetType: 'note' | 'section';
    permissions: 'view' | 'edit';
    expiresAt?: string;
  }
): Promise<SharedKeyEnvelope> {
  const sodium = await getSodium();
  
  // Generate ephemeral keypair for this share operation
  const ephemeral = sodium.crypto_box_keypair();
  
  // Compute shared secret: X25519(ephemeral.secret, recipient.public)
  const sharedSecret = sodium.crypto_scalarmult(
    ephemeral.privateKey,
    recipientPublicKey
  );
  
  // Derive a symmetric key from the shared secret using BLAKE2b
  const symmetricKey = sodium.crypto_generichash(32, sharedSecret);
  
  // Encrypt the item key with the derived symmetric key
  const nonce = sodium.randombytes_buf(
    sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  );
  
  // Bind share metadata as associated data
  const ad = sodium.from_string(
    `darklock:share:${metadata.shareId}:${metadata.targetId}:${metadata.recipientId}`
  );
  
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    itemKey,
    ad,
    null,
    nonce,
    symmetricKey
  );
  
  // Zero intermediates
  sodium.memzero(sharedSecret);
  sodium.memzero(symmetricKey);
  sodium.memzero(ephemeral.privateKey);
  
  return {
    shareId: metadata.shareId,
    senderId: metadata.senderId,
    recipientId: metadata.recipientId,
    targetId: metadata.targetId,
    targetType: metadata.targetType,
    permissions: metadata.permissions,
    encryptedKey: sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL),
    ephemeralPublicKey: sodium.to_base64(ephemeral.publicKey, sodium.base64_variants.ORIGINAL),
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
    expiresAt: metadata.expiresAt,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Open a shared key envelope — decrypts the item/content key using
 * the recipient's private key.
 */
export async function openShareEnvelope(
  envelope: SharedKeyEnvelope,
  recipientSecretKey: Bytes
): Promise<Bytes> {
  const sodium = await getSodium();
  
  const ephemeralPublicKey = sodium.from_base64(
    envelope.ephemeralPublicKey,
    sodium.base64_variants.ORIGINAL
  );
  const nonce = sodium.from_base64(envelope.nonce, sodium.base64_variants.ORIGINAL);
  const ciphertext = sodium.from_base64(
    envelope.encryptedKey,
    sodium.base64_variants.ORIGINAL
  );
  
  // Reconstruct shared secret: X25519(recipient.secret, ephemeral.public)
  const sharedSecret = sodium.crypto_scalarmult(
    recipientSecretKey,
    ephemeralPublicKey
  );
  
  // Derive symmetric key
  const symmetricKey = sodium.crypto_generichash(32, sharedSecret);
  
  // Reconstruct associated data
  const ad = sodium.from_string(
    `darklock:share:${envelope.shareId}:${envelope.targetId}:${envelope.recipientId}`
  );
  
  try {
    const itemKey = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      ciphertext,
      ad,
      nonce,
      symmetricKey
    );
    
    // Zero intermediates
    sodium.memzero(sharedSecret);
    sodium.memzero(symmetricKey);
    
    return itemKey;
  } catch {
    sodium.memzero(sharedSecret);
    sodium.memzero(symmetricKey);
    throw new Error('Failed to open share envelope: invalid key or tampered envelope');
  }
}
