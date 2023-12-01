// import { Logger } from "@biconomy/common";
// import { Signer, ethers } from "ethers";
// import { Bytes, arrayify } from "ethers/lib/utils";
// import {
//   ModuleVersion,
//   DEFAULT_ECDSA_OWNERSHIP_MODULE,
//   BaseValidationModule,
//   BaseValidationModuleConfig,
// } from "@biconomy/modules";

// export interface SchnorrValidationModuleConfig
//   extends BaseValidationModuleConfig {
//   moduleAddress?: string;
//   version?: ModuleVersion;
//   multisigAddress: string;
// }

// export declare const DEFAULT_SCHNORR_VALIDATION_MODULE = "0x";
// export declare const SCHNORR_VALIDATION_MODULE_ADDRESSES_BY_VERSION: {
//   V1_0_0: string;
// };

// // Could be renamed with suffix API
// export class SchnorrValidationModule extends BaseValidationModule {
//   moduleAddress!: string;
//   multisigAddress!: string;

//   version: ModuleVersion = "V1_0_0";

//   private constructor(moduleConfig: SchnorrValidationModuleConfig) {
//     super(moduleConfig);
//   }

//   public static async create(
//     moduleConfig: SchnorrValidationModuleConfig
//   ): Promise<SchnorrValidationModule> {
//     const instance = new SchnorrValidationModule(moduleConfig);
//     if (moduleConfig.moduleAddress) {
//       instance.moduleAddress = moduleConfig.moduleAddress;
//     } else if (moduleConfig.version) {
//       const moduleAddr =
//         SCHNORR_VALIDATION_MODULE_ADDRESSES_BY_VERSION[moduleConfig.version];
//       if (!moduleAddr) {
//         throw new Error(`Invalid version ${moduleConfig.version}`);
//       }
//       instance.moduleAddress = moduleAddr;
//       instance.version = moduleConfig.version as ModuleVersion;
//     } else {
//       instance.moduleAddress = DEFAULT_SCHNORR_VALIDATION_MODULE;
//     }

//     instance.multisigAddress = moduleConfig.multisigAddress;

//     return instance;
//   }

//   getAddress(): string {
//     return this.moduleAddress;
//   }

//   async getSigner(): Promise<Signer> {
//     throw new Error("Method not implemented.");
//   }

//   // TODO: implement this
//   async getDummySignature(): Promise<string> {
//     const moduleAddress = ethers.utils.getAddress(this.getAddress());
//     const dynamicPart = moduleAddress.substring(2).padEnd(40, "0");
//     return `0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000${dynamicPart}000000000000000000000000000000000000000000000000000000000000004181d4b4981670cb18f99f0b4a66446df1bf5b204d24cfcb659bf38ba27a4359b5711649ec2423c5e1247245eba2964679b6a1dbb85c992ae40b9b00c6935b02ff1b00000000000000000000000000000000000000000000000000000000000000`;
//   }

//   async getInitData(): Promise<string> {
//     const moduleAbi = "function initForSmartAccount(address multisigAddress)";
//     const moduleInterface = new ethers.utils.Interface([moduleAbi]);
//     const initData = moduleInterface.encodeFunctionData("initForSmartAccount", [
//       this.multisigAddress,
//     ]);
//     return initData;
//   }

//   async signUserOpHash(userOpHash: string): Promise<string> {
//     const sig = await this.signer.signMessage(arrayify(userOpHash));

//     Logger.log("ecdsa signature ", sig);

//     return sig;
//   }

//   async signMessage(message: Bytes | string): Promise<string> {
//     let signature = await this.signer.signMessage(message);

//     const potentiallyIncorrectV = parseInt(signature.slice(-2), 16);
//     if (![27, 28].includes(potentiallyIncorrectV)) {
//       const correctV = potentiallyIncorrectV + 27;
//       signature = signature.slice(0, -2) + correctV.toString(16);
//     }

//     return signature;
//   }
// }
