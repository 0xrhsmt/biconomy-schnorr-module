import { useCallback, useState, useEffect } from "react";
import {
  SchnorrSigner,
  SchnorrValidationModule,
  SchnorrValidationModuleConfig,
} from "schnorr-validation-module";
import {
  BiconomySmartAccountV2,
  DEFAULT_ENTRYPOINT_ADDRESS,
} from "@biconomy/account";
import { IBundler, Bundler } from "@biconomy/bundler";
import { ChainId } from "@biconomy/core-types";
import { IPaymaster, BiconomyPaymaster } from "@biconomy/paymaster";
import { BigNumber, ethers } from "ethers";

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

function App() {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider>();
  const [signers, setSigners] = useState<SchnorrSigner[]>([]);
  const [publicKeys, setPublicKeys] = useState<
    SchnorrValidationModuleConfig["publicKeys"]
  >([]);
  const [publicNonces, setPublicNonces] = useState<
    SchnorrValidationModuleConfig["publicNonces"]
  >([]);
  const [accountAPI, setAccountAPI] = useState<BiconomySmartAccountV2 | null>(
    null
  );
  const [accountAddress, setAccountAddress] = useState<string>("");
  const [accountBalance, setAccountBalance] = useState<BigNumber>(
    BigNumber.from(0)
  );
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [despotTxHashes, setSespotTxHashes] = useState<string[]>([]);
  const [latestOpTxHash, setLatestOpTxHash] = useState<string>("");

  const refreshAccountBalance = useCallback(async () => {
    if (!provider) {
      return;
    }

    setAccountBalance(await provider.getBalance(accountAddress));
  }, [accountAddress, provider]);

  const handleAddSigner = useCallback(() => {
    const signer = new SchnorrSigner();

    setSigners((prev) => [...prev, signer]);
  }, []);

  const handleDeposit = useCallback(async () => {
    if (!provider) {
      return;
    }
    const signer = provider.getSigner();

    const tx = await signer.sendTransaction({
      to: accountAddress,
      value: ethers.utils.parseEther("0.05"),
    });
    setSespotTxHashes((prev) => [...prev, tx.hash]);

    await tx.wait();
    await refreshAccountBalance();
  }, [accountAddress, provider, refreshAccountBalance]);

  const handleTransfer = useCallback(async () => {
    if (!accountAPI) {
      return;
    }
    if (recipientAddress === "") {
      alert("Please enter recipient address");
      return;
    }

    const op = await accountAPI.buildUserOp([
      {
        to: recipientAddress,
        value: ethers.utils.parseEther("0.01"),
      },
    ]);
    const opHash = await accountAPI.getUserOpHash(op);
    const partnerSignatures = signers.slice(1).map((signer) => {
      const { signature } = signer.multiSignMessage(
        opHash,
        publicKeys,
        publicNonces
      );
      return signature;
    });

    const opRes = await accountAPI.sendUserOp(op, {
      partnerSignatures,
    } as any);

    const opStatusRes = await opRes.waitForTxHash();
    if (opStatusRes.transactionHash) {
      setLatestOpTxHash(opStatusRes.transactionHash);
    }

    await refreshAccountBalance();
  }, [
    accountAPI,
    publicKeys,
    publicNonces,
    recipientAddress,
    signers,
    refreshAccountBalance,
  ]);

  useEffect(() => {
    const createProvider = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const network = await provider.getNetwork();
      if (network.chainId !== ChainId.POLYGON_MUMBAI) {
        alert("Please connect to Polygon Mumbai Testnet");
        return;
      }

      setProvider(provider);
    };

    createProvider();
  }, []);

  useEffect(() => {
    if (signers.length < 2) {
      setAccountAPI(null);
      return;
    }

    const createAccountAPI = async () => {
      const signerPublicKeys = signers.map((signer) => signer.publicKey);
      const signerPublicNonces = signers.map((signer) => signer.publicNonces);
      const schnorrModule = await SchnorrValidationModule.create({
        signer: signers[0],
        publicKeys: signerPublicKeys,
        publicNonces: signerPublicNonces,
      });

      const biconomySmartAccount = await BiconomySmartAccountV2.create({
        chainId: ChainId.POLYGON_MUMBAI,
        bundler: bundler,
        paymaster: paymaster,
        entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
        defaultValidationModule: schnorrModule,
        activeValidationModule: schnorrModule,
      });

      setAccountAPI(biconomySmartAccount);
      setAccountAddress(await biconomySmartAccount.getAccountAddress());
      setPublicKeys(signerPublicKeys);
      setPublicNonces(signerPublicNonces);

      await refreshAccountBalance();
    };

    createAccountAPI();
  }, [provider, refreshAccountBalance, signers]);

  const isSignerAddable = accountBalance.eq(0);
  const isDepositable = accountAddress !== "" && !accountBalance.gt(0);
  const isTransferable = accountAddress !== "" && accountBalance.gt(0);

  return (
    <div className="max-w-[750px] mx-auto px-8 p-8">
      <div className="flex flex-col justify-center items-center mb-10">
        <h1 className="text-2xl text-center font-bold">Demo App</h1>
        <p className="text-center text-gray-600">
          Use biconomy schnorr module to transfer native tokens
        </p>
      </div>

      <div className="card w-full bg-base-100 shadow-xl mb-8">
        <div className="card-body">
          <div className="mb-8">
            <h2 className="card-title mb-8">Step 1: Setup Multiple Signers</h2>
            <div className="grid grid-cols-1 gap-4 mb-4">
              {signers.map((signer, index) => {
                return (
                  <div className="card bg-base-300" key={index}>
                    <div className="card-body">
                      <h2 className="card-title">Signer {index + 1}</h2>
                      <ul>
                        <li className="truncate">
                          Private Key: {signer.privateKey.toHex()}
                        </li>
                        <li className="truncate">
                          Publick Key: {signer.publicKey.toHex()}
                        </li>
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              className="btn btn-block btn-primary mb-8"
              onClick={handleAddSigner}
              disabled={!isSignerAddable}
            >
              Add Signer
            </button>

            <p className="">
              Predicted Biconomy Smart Account:{" "}
              {accountAddress ? accountAddress : "N/A"}
            </p>
          </div>

          <div className="mb-8">
            <h2 className="card-title mb-4">
              Step 2: Deposit Native Token To Biconomy Smart Account
            </h2>
            <div className="py-8">
              <p className="mb-4">
                To: {accountAddress ? accountAddress : "N/A"}
              </p>
              <p className="mb-4">
                Balance: {ethers.utils.formatEther(accountBalance)}
              </p>
            </div>

            <button
              className="btn btn-block btn-primary"
              onClick={handleDeposit}
              disabled={!isDepositable}
            >
              Deposit 0.05 MATIC
            </button>

            {despotTxHashes.length > 0 && (
              <div className="mb-8">
                {despotTxHashes.map((txHash, index) => {
                  return (
                    <div className="py-2" key={index}>
                      <p>
                        Deposit Tx Hash:{" "}
                        <a
                          className="link-primary"
                          href={`https://mumbai.polygonscan.com/tx/${txHash}`}
                          target="_blank"
                        >
                          {txHash}
                        </a>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className=" mb-6">
            <h2 className="card-title mb-4">
              Step 3: Send User Op Using Schnorr Module
            </h2>

            <div className="w-full mb-4">
              <div>
                <div className="label">
                  <span className="label-text">Recipient Address</span>
                </div>
                <input
                  type="text"
                  value={recipientAddress}
                  placeholder={` Amount`}
                  className="input input-bordered  w-full"
                  onChange={(e) => setRecipientAddress(e.target.value)}
                />
              </div>

              <p className="my-4">Amount: 0.01</p>
            </div>
            <button
              className="btn btn-block btn-primary"
              onClick={handleTransfer}
              disabled={!isTransferable}
            >
              Send User Operation
            </button>
          </div>

          {latestOpTxHash && (
            <div className="mb-8">
              <div className="">
                <p className="">
                  User Op Tx Hash:{" "}
                  <a
                    className="link-primary"
                    href={`https://mumbai.polygonscan.com/tx/${latestOpTxHash}`}
                    target="_blank"
                  >
                    {latestOpTxHash}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
