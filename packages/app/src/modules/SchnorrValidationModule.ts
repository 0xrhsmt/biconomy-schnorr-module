import { Signer, ethers } from "ethers";
import { Bytes } from "ethers/lib/utils";
import {
  ModuleVersion,
  BaseValidationModule,
  BaseValidationModuleConfig,
} from "@biconomy/modules";
import Schnorrkel, {
  Key,
  Signature,
  PublicNonces,
} from "@borislav.itskov/schnorrkel.js";
import SchnorrSigner from "./SchnorrSigner";

export interface SchnorrValidationModuleConfig
  extends BaseValidationModuleConfig {
  moduleAddress?: string;
  version?: ModuleVersion;

  signer: SchnorrSigner;
  partnerPublicKeys: Key[];
  partnerPublicNonces: PublicNonces[];
  partnerSignatures: Signature[];
}

export declare const DEFAULT_SCHNORR_VALIDATION_MODULE = "0x";
export declare const SCHNORR_VALIDATION_MODULE_ADDRESSES_BY_VERSION: {
  V1_0_0: string;
};

export function computeSchnorrAddress(combinedPublicKey: Key) {
  const px = ethers.utils.hexlify(combinedPublicKey.buffer.slice(1, 33));
  const schnorrHash = ethers.utils.keccak256(
    ethers.utils.solidityPack(["string", "bytes"], ["SCHNORR", px])
  );
  return "0x" + schnorrHash.slice(schnorrHash.length - 40, schnorrHash.length);
}

// Could be renamed with suffix API
export class SchnorrValidationModule extends BaseValidationModule {
  moduleAddress!: string;
  signer!: SchnorrSigner;
  partnerPublicKeys!: Key[];
  partnerPublicNonces!: PublicNonces[];
  partnerSignatures!: Signature[];

  version: ModuleVersion = "V1_0_0";

  private constructor(moduleConfig: SchnorrValidationModuleConfig) {
    super(moduleConfig);
  }

  public static async create(
    moduleConfig: SchnorrValidationModuleConfig
  ): Promise<SchnorrValidationModule> {
    const instance = new SchnorrValidationModule(moduleConfig);
    if (moduleConfig.moduleAddress) {
      instance.moduleAddress = moduleConfig.moduleAddress;
    } else if (moduleConfig.version) {
      const moduleAddr =
        SCHNORR_VALIDATION_MODULE_ADDRESSES_BY_VERSION[moduleConfig.version];
      if (!moduleAddr) {
        throw new Error(`Invalid version ${moduleConfig.version}`);
      }
      instance.moduleAddress = moduleAddr;
      instance.version = moduleConfig.version as ModuleVersion;
    } else {
      instance.moduleAddress = DEFAULT_SCHNORR_VALIDATION_MODULE;
    }

    instance.partnerPublicKeys = moduleConfig.partnerPublicKeys;
    instance.partnerPublicNonces = moduleConfig.partnerPublicNonces;
    instance.partnerSignatures = moduleConfig.partnerSignatures;

    return instance;
  }

  getAddress(): string {
    return this.moduleAddress;
  }

  async getSigner(): Promise<Signer> {
    throw new Error("Method not implemented.");
  }

  async getDummySignature(): Promise<string> {
    const moduleAddress = ethers.utils.getAddress(this.getAddress());
    const dynamicPart = moduleAddress.substring(2).padEnd(40, "0");
    return `0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000${dynamicPart}000000000000000000000000000000000000000000000000000000000000004181d4b4981670cb18f99f0b4a66446df1bf5b204d24cfcb659bf38ba27a4359b5711649ec2423c5e1247245eba2964679b6a1dbb85c992ae40b9b00c6935b02ff1b00000000000000000000000000000000000000000000000000000000000000`;
  }

  async getInitData(): Promise<string> {
    const publicKeys = [this.signer.getPublicKey(), ...this.partnerPublicKeys];
    const combinedPublicKey = Schnorrkel.getCombinedPublicKey(publicKeys);
    const schnorrVirtualAddr = computeSchnorrAddress(combinedPublicKey);

    const moduleAbi =
      "function initForSmartAccount(address schnorrVirtualAddress)";
    const moduleInterface = new ethers.utils.Interface([moduleAbi]);
    const initData = moduleInterface.encodeFunctionData("initForSmartAccount", [
      schnorrVirtualAddr,
    ]);
    return initData;
  }

  async signUserOpHash(userOpHash: string): Promise<string> {
    const signature = await this.signMessage(userOpHash);

    return signature;
  }

  async signMessage(message: Bytes | string): Promise<string> {
    const publicKeys = [this.signer.getPublicKey(), ...this.partnerPublicKeys];

    const combinedPublicKey = Schnorrkel.getCombinedPublicKey(publicKeys);
    const px = ethers.utils.hexlify(combinedPublicKey.buffer.slice(1, 33));
    const parity = combinedPublicKey.buffer[0] - 2 + 27;

    const publicNonces = [
      this.signer.getPublicNonces(),
      ...this.partnerPublicNonces,
    ];

    const { signature: signatureOne, challenge } = this.signer.multiSignMessage(
      message.toString(),
      publicKeys,
      publicNonces
    );
    const signatureSummed = Schnorrkel.sumSigs([
      signatureOne,
      ...this.partnerSignatures,
    ]);

    const abiCoder = new ethers.utils.AbiCoder();
    const signature = abiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "uint8"],
      [px, challenge.buffer, signatureSummed.buffer, parity]
    );

    return signature;
  }
}
