import { describe, expect, it, beforeAll } from "vitest";
import {
  EntryPoint,
  EntryPoint__factory,
} from "@account-abstraction/contracts";

import { ethers } from "ethers";
import {
  SimpleAccount,
  SimpleAccount__factory,
} from "@account-abstraction/utils/dist/src/types";

import {
  SmartAccount_v200,
  SmartAccount_v200__factory,
  SmartAccountFactory_v200__factory,
} from "@biconomy/common";

import { BiconomySmartAccountV2 } from "@biconomy/account";
import { ChainId } from "@biconomy/core-types";

import { SchnorrSigner, SchnorrValidationModule } from "../src";
import SchnorrValidationModuleArtifacts from "../artifacts/contracts/modules/SchnorrValidationModule.sol/SchnorrValidationModule.json";
import { Key, PublicNonces } from "@borislav.itskov/schnorrkel.js/src";

const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
const signer = provider.getSigner();

const HARDHAT_CHAIN_ID = 31337 as ChainId;

describe("SchnorrValidationModule", () => {
  let accountAPI: BiconomySmartAccountV2;
  let entryPoint: EntryPoint;
  let beneficiary: string;
  let recipient: SimpleAccount;
  let accountAddress: string;

  let signerOne: SchnorrSigner;
  let partnerSigners: SchnorrSigner[];
  let signerPublicKeys: Key[];
  let signerPublicNonces: PublicNonces[];
  let schnorrModuleContract: ethers.Contract;
  let schnorrModule: SchnorrValidationModule;

  beforeAll(async () => {
    entryPoint = await new EntryPoint__factory(signer).deploy();
    beneficiary = await signer.getAddress();
    recipient = await new SimpleAccount__factory(signer).deploy(
      entryPoint.address
    );

    signerOne = new SchnorrSigner();
    partnerSigners = [new SchnorrSigner(), new SchnorrSigner()];
    const signers = [signerOne, ...partnerSigners];
    signerPublicKeys = signers.map((signer) => signer.publicKey);
    signerPublicNonces = signers.map((signer) => signer.publicNonces);

    const schnorrModuleFactory = new ethers.ContractFactory(
      SchnorrValidationModuleArtifacts.abi,
      SchnorrValidationModuleArtifacts.bytecode,
      signer
    );
    schnorrModuleContract = await schnorrModuleFactory.deploy();
    schnorrModule = await SchnorrValidationModule.create({
      signer: signerOne,
      moduleAddress: schnorrModuleContract.address,
      publicKeys: signerPublicKeys,
      publicNonces: signerPublicNonces,
    });

    const accountImpl: SmartAccount_v200 = await new SmartAccount_v200__factory(
      signer
    ).deploy(entryPoint.address);
    const accountFactory = await new SmartAccountFactory_v200__factory(
      signer
    ).deploy(accountImpl.address, await signer.getAddress());

    accountAPI = await BiconomySmartAccountV2.create({
      chainId: HARDHAT_CHAIN_ID,
      rpcUrl: "http://127.0.0.1:8545",
      entryPointAddress: entryPoint.address,
      factoryAddress: accountFactory.address,
      implementationAddress: accountImpl.address,
      defaultFallbackHandler: await accountFactory.minimalHandler(),
      defaultValidationModule: schnorrModule,
      activeValidationModule: schnorrModule,
    });

    accountAddress = await accountAPI.getAccountAddress();
  }, 30000);

  it("Nonce should be zero", async () => {
    const builtUserOp = await accountAPI.buildUserOp([
      {
        to: recipient.address,
        value: ethers.utils.parseEther("1".toString()),
        data: "0x",
      },
    ]);
    expect(builtUserOp?.nonce?.toString()).toBe("0");
  });

  it("Sender should be non zero", async () => {
    const builtUserOp = await accountAPI.buildUserOp([
      {
        to: recipient.address,
        value: ethers.utils.parseEther("1".toString()),
        data: "0x",
      },
    ]);
    expect(builtUserOp.sender).not.toBe(ethers.constants.AddressZero);
  });

  it("should deploy SmartAccount and transfer ETH", async () => {
    expect(
      await provider.getCode(accountAddress).then((code) => code.length)
    ).toBe(2);

    await signer.sendTransaction({
      to: accountAddress,
      value: ethers.utils.parseEther("0.1"),
    });

    const op = await accountAPI.buildUserOp([
      {
        to: recipient.address,
        value: ethers.utils.parseEther("0.05"),
      },
    ]);
    const opHash = await accountAPI.getUserOpHash(op);
    const partnerSignatures = partnerSigners.map((signer) => {
      const { signature } = signer.multiSignMessage(
        opHash,
        signerPublicKeys,
        signerPublicNonces
      );

      return signature;
    });
    const signedUserOp = await accountAPI.signUserOp(op, {
      partnerSignatures,
    } as any);

    await entryPoint.handleOps([signedUserOp], beneficiary);

    expect(
      await provider.getCode(accountAddress).then((code) => code.length)
    ).toBeGreaterThan(2);

    const recipientBalance = await provider.getBalance(recipient.address);
    expect(recipientBalance.toString()).toBe(
      ethers.utils.parseEther("0.05").toString()
    );
  }, 10000); // on github runner it takes more time than 5000ms

  it("should check if module is enabled", async () => {
    const isEcdsaModuleEnabled = await accountAPI.isModuleEnabled(
      schnorrModule.moduleAddress
    );

    expect(isEcdsaModuleEnabled).toBe(true);
  });
});
