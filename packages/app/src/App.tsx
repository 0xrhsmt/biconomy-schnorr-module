import { useState } from "react";
import Schnorrkel, { Key } from "@borislav.itskov/schnorrkel.js";
import { IBundler, Bundler } from "@biconomy/bundler";
import {
  BiconomySmartAccountV2,
  DEFAULT_ENTRYPOINT_ADDRESS,
} from "@biconomy/account";
import { DEFAULT_ECDSA_OWNERSHIP_MODULE } from "@biconomy/modules";
import { ethers } from "ethers";
import { ChainId } from "@biconomy/core-types";
import { IPaymaster, BiconomyPaymaster } from "@biconomy/paymaster";

import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import SchnorrSigner from "./modules/SchnorrSigner";
import { SchnorrValidationModule } from "./modules/SchnorrValidationModule";

const bundler: IBundler = new Bundler({
  //https://dashboard.biconomy.io/
  bundlerUrl:
    "https://bundler.biconomy.io/api/v2/80001/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
  chainId: ChainId.POLYGON_MUMBAI,
  entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
});

const paymaster: IPaymaster = new BiconomyPaymaster({
  //https://dashboard.biconomy.io/
  paymasterUrl:
    "https://paymaster.biconomy.io/api/v1/80001/bN77UefF7.145fff89-e5e1-40ec-be11-7549878eb08f",
});

export function computeSchnorrAddress(combinedPublicKey: Key) {
  const px = ethers.utils.hexlify(combinedPublicKey.buffer.slice(1, 33));
  const schnorrHash = ethers.utils.keccak256(
    ethers.utils.solidityPack(["string", "bytes"], ["SCHNORR", px])
  );
  return "0x" + schnorrHash.slice(schnorrHash.length - 40, schnorrHash.length);
}

function App() {
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [smartAccount, setSmartAccount] =
    useState<BiconomySmartAccountV2 | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Provider | null>(
    null
  );

  const [count, setCount] = useState(0);

  const sendTransaction = () => {
    const signerOne = new SchnorrSigner();
    const signerTwo = new SchnorrSigner();

    const publicKeyOne = signerOne.getPublicKey();
    const publicKeyTwo = signerTwo.getPublicKey();
    const publicKeys = [publicKeyOne, publicKeyTwo];

    const publicNoncesOne = signerOne.getPublicNonces();
    const publicNoncesTwo = signerTwo.getPublicNonces();
    const publicNonces = [publicNoncesOne, publicNoncesTwo];

    const combinedPublicKey = Schnorrkel.getCombinedPublicKey(publicKeys);
    const schnorrVirtualAddr = computeSchnorrAddress(combinedPublicKey);

    const msg = "test message";

    const { signature: signatureOne, challenge } = signerOne.multiSignMessage(
      msg,
      publicKeys,
      publicNonces
    );
    const { signature: signatureTwo } = signerTwo.multiSignMessage(
      msg,
      publicKeys,
      publicNonces
    );
    const summedSignature = Schnorrkel.sumSigs([signatureOne, signatureTwo]);

    const px = ethers.utils.hexlify(combinedPublicKey.buffer.slice(1, 33));
    const parity = combinedPublicKey.buffer[0] - 2 + 27;

    const abiCoder = new ethers.utils.AbiCoder();
    const signature = abiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "uint8"],
      [px, challenge.buffer, summedSignature.buffer, parity]
    );

    console.log("signature", signature);
    console.log("schnorrVirtualAddr", schnorrVirtualAddr);
  };

  const connect = async () => {
    const signerOne = new SchnorrSigner();
    const signerTwo = new SchnorrSigner();

    const publicKeyOne = signerOne.getPublicKey();
    const publicKeyTwo = signerTwo.getPublicKey();
    const publicKeys = [publicKeyOne, publicKeyTwo];

    const publicNoncesOne = signerOne.getPublicNonces();
    const publicNoncesTwo = signerTwo.getPublicNonces();
    const publicNonces = [publicNoncesOne, publicNoncesTwo];

    const msg = "test message";
    const { signature: signatureTwo } = signerTwo.multiSignMessage(
      msg,
      publicKeys,
      publicNonces
    );

    const { ethereum } = window;

    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(ethereum);
      await provider.send("eth_requestAccounts", []);

      const ownerShipModule = await SchnorrValidationModule.create({
        signer: signerOne,
        moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE,
        partnerPublicKeys: [publicKeyTwo],
        partnerPublicNonces: [publicNoncesTwo],
        partnerSignatures: [signatureTwo],
      });

      setProvider(provider);
      const biconomySmartAccount = await BiconomySmartAccountV2.create({
        chainId: ChainId.POLYGON_MUMBAI,
        bundler: bundler,
        paymaster: paymaster,
        entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
        defaultValidationModule: ownerShipModule,
        activeValidationModule: ownerShipModule,
      });
      setAddress(await biconomySmartAccount.getAccountAddress());
      setSmartAccount(biconomySmartAccount);
      setLoading(false);

      const tx = {
        to: "0xdA5289fCAAF71d52a80A254da614a192b693e977", //erc20 token address
        data: "0x",
        value: "0",
      };

      // build user op
      let userOp = await biconomySmartAccount.buildUserOp([tx], {
        params: {},
      });

      const userOpHash = biconomySmartAccount.getUserOpHash(userOp);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>

      <button onClick={sendTransaction}>Send Transaction</button>
    </>
  );
}

export default App;
