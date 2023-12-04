import {
  ModuleVersion,
  BaseValidationModuleConfig,
  ModuleInfo as BaseModuleInfo,
} from "@biconomy/modules";
import Schnorrkel, {
  Key,
  Signature,
  PublicNonces,
} from "@borislav.itskov/schnorrkel.js/src/index";

import { SchnorrSigner } from "./SchnorrSigner";

export interface SchnorrValidationModuleConfig
  extends BaseValidationModuleConfig {
  moduleAddress?: string;
  version?: ModuleVersion;

  signer: SchnorrSigner;
  publicKeys: Key[];
  publicNonces: PublicNonces[];
}

export type SchnorrValidationModuleInfo = BaseModuleInfo & {
  partnerSignatures: Signature[];
};
