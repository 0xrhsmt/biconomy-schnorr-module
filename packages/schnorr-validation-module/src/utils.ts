import { ethers } from "ethers";
import { Key } from "@borislav.itskov/schnorrkel.js/src/index";

export function computeSchnorrVirtualAddr(combinedPublicKey: Key) {
  const px = ethers.utils.hexlify(combinedPublicKey.buffer.slice(1, 33));
  const schnorrHash = ethers.utils.solidityPack(
    ["string", "bytes"],
    ["SCHNORR", px]
  );

  return "0x" + schnorrHash.slice(schnorrHash.length - 40, schnorrHash.length);
}
