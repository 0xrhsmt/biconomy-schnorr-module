import Schnorrkel, {
  Key,
  PublicNonces,
  KeyPair,
} from "@borislav.itskov/schnorrkel.js";
import { ethers } from "ethers";
import secp256k1 from "secp256k1";
import { Buffer } from "buffer";
window.Buffer = Buffer;

const schnorrkel = new Schnorrkel();

export default class SchnorrSigner {
  privateKey: Key;
  publicKey: Key;

  constructor() {
    const keys = this.generateRandomKeys();
    this.privateKey = keys.privateKey;
    this.publicKey = keys.publicKey;
  }

  getPrivateKey(): Key {
    return this.privateKey;
  }

  getPublicKey(): Key {
    return this.publicKey;
  }

  getPublicNonces(): PublicNonces {
    return schnorrkel.generatePublicNonces(this.privateKey);
  }

  multiSignMessage(
    msg: string,
    publicKeys: Key[],
    publicNonces: PublicNonces[]
  ) {
    return schnorrkel.multiSigSign(
      this.privateKey,
      msg,
      publicKeys,
      publicNonces
    );
  }

  generateRandomKeys = () => {
    let privKeyBytes: Buffer;
    do {
      privKeyBytes = Buffer.from(ethers.utils.randomBytes(32));
    } while (!secp256k1.privateKeyVerify(privKeyBytes));

    const pubKey = Buffer.from(secp256k1.publicKeyCreate(privKeyBytes));

    const data = {
      publicKey: pubKey,
      privateKey: privKeyBytes,
    };

    return new KeyPair(data);
  };
}
