import { Signer, ethers } from "ethers";
import { Bytes } from "ethers/lib/utils";
import { ModuleVersion, BaseValidationModule } from "@biconomy/modules";
import Schnorrkel, {
  Key,
  Signature,
  PublicNonces,
} from "@borislav.itskov/schnorrkel.js/src/index";

import { SchnorrSigner } from "./schnorrSigner";
import {
  SchnorrValidationModuleConfig,
  SchnorrValidationModuleInfo,
} from "./types";
import {
  DEFAULT_SCHNORR_VALIDATION_MODULE,
  SCHNORR_VALIDATION_MODULE_ADDRESSES_BY_VERSION,
} from "./constants";
import { computeSchnorrVirtualAddr } from "./utils";

// Could be renamed with suffix API
export class SchnorrValidationModule extends BaseValidationModule {
  moduleAddress!: string;
  signer!: SchnorrSigner;
  publicKeys!: Key[];
  publicNonces!: PublicNonces[];

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

    instance.signer = moduleConfig.signer;
    instance.publicKeys = moduleConfig.publicKeys;
    instance.publicNonces = moduleConfig.publicNonces;

    return instance;
  }

  getAddress(): string {
    return this.moduleAddress;
  }

  async getSigner(): Promise<Signer> {
    throw new Error("Method not implemented.");
  }

  async getDummySignature(): Promise<string> {
    return `0xcab5cbe1054ca3a019b08b6ec402cd11ea58692ec9cc14586ff4fc25dc13df1f3de5f1fe8963f570bfc3c2cf43efeac84962070e02871868f811952ddcf9251b550f77c3e7c72a22fcf64e8ebb94a2e59b43fc42a50f3bc345a7e1d39cddea00000000000000000000000000000000000000000000000000000000000000001c`;
  }

  async getInitData(): Promise<string> {
    const combinedPublicKey = Schnorrkel.getCombinedPublicKey(this.publicKeys);
    const schnorrVirtualAddr = computeSchnorrVirtualAddr(combinedPublicKey);

    const moduleAbi =
      "function initForSmartAccount(address schnorrVirtualAddress)";
    const moduleInterface = new ethers.utils.Interface([moduleAbi]);
    const initData = moduleInterface.encodeFunctionData("initForSmartAccount", [
      schnorrVirtualAddr,
    ]);
    return initData;
  }

  async signUserOpHash(
    userOpHash: string,
    params?: SchnorrValidationModuleInfo
  ): Promise<string> {
    const signature = await this._signMessage(
      userOpHash,
      params?.partnerSignatures || []
    );

    return signature;
  }

  async signMessage(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  private async _signMessage(
    message: Bytes | string,
    partnerSignatures: Signature[]
  ): Promise<string> {
    const { signature: mySignature, challenge } = this.signer.multiSignMessage(
      message as any,
      this.publicKeys,
      this.publicNonces
    );
    const summedSignature = Schnorrkel.sumSigs([
      mySignature,
      ...partnerSignatures,
    ]);

    const combinedPublicKey = Schnorrkel.getCombinedPublicKey(this.publicKeys);
    const px = ethers.utils.hexlify(combinedPublicKey.buffer.slice(1, 33));
    const parity = combinedPublicKey.buffer[0] - 2 + 27;

    const abiCoder = new ethers.utils.AbiCoder();
    const signature = abiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "uint8"],
      [px, challenge.buffer, summedSignature.buffer, parity]
    );

    return signature;
  }
}
