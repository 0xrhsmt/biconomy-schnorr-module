import Schnorrkel, {
  Key,
  PublicNonces,
  KeyPair,
} from "@borislav.itskov/schnorrkel.js/src/index";
import { ethers } from "ethers";
import secp256k1 from "secp256k1";
import { Buffer } from "buffer";
import { getSchnorrkelInstance } from "./Schnorrkel";

const schnorrkel = getSchnorrkelInstance();

export class SchnorrSigner {
  keyPair: KeyPair;
  private _publicNonces: PublicNonces;

  constructor(keyPair?: KeyPair) {
    this.keyPair = keyPair || this.generateRandomKeys();
    this._publicNonces = schnorrkel.generatePublicNonces(this.privateKey);
  }

  static fromJson(params: string): SchnorrSigner {
    const keyPair = KeyPair.fromJson(params);
    return new SchnorrSigner(keyPair);
  }

  get privateKey(): Key {
    return this.keyPair.privateKey;
  }

  get publicKey(): Key {
    return this.keyPair.publicKey;
  }

  get publicNonces(): PublicNonces {
    if (!this._publicNonces) {
      this._publicNonces = schnorrkel.generatePublicNonces(this.privateKey);
    }

    return this._publicNonces;
  }

  regeneratePublicNonces(): PublicNonces {
    this._publicNonces = schnorrkel.generatePublicNonces(this.privateKey);
    return this._publicNonces;
  }

  multiSignMessage(
    msgHash: string,
    publicKeys: Key[],
    publicNonces: PublicNonces[]
  ) {
    return schnorrkel.multiSigSign(
      this.privateKey,
      msgHash,
      publicKeys,
      publicNonces,
      (msg: string) => msg
    );
  }

  toJson(): string {
    return this.keyPair.toJson();
  }

  private generateRandomKeys = () => {
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
