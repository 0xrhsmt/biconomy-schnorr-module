// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {BaseAuthorizationModule} from "./BaseAuthorizationModule.sol";
import {UserOperation} from "@account-abstraction/contracts/interfaces/UserOperation.sol";

contract SchnorrValidationModule is BaseAuthorizationModule {
    uint256 internal constant Q =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    bytes4 internal constant ERC1271_MAGICVALUE_BYTES32 = 0x1626ba7e;

    string public constant NAME = "Schnorr Validation Module";
    string public constant VERSION = "0.1.0";

    mapping(address => address) internal smartAccountOwners;

    error NoschnorrVirtualAddressRegisteredForSmartAccount(
        address smartAccount
    );
    error AlreadyInitedForSmartAccount(address smartAccount);
    error ZeroAddressNotAllowedAsschnorrVirtualAddress();

    function initForSmartAccount(
        address schnorrVirtualAddress
    ) external returns (address) {
        if (smartAccountOwners[msg.sender] != address(0))
            revert AlreadyInitedForSmartAccount(msg.sender);
        if (schnorrVirtualAddress == address(0))
            revert ZeroAddressNotAllowedAsschnorrVirtualAddress();
        smartAccountOwners[msg.sender] = schnorrVirtualAddress;
        return address(this);
    }

    function getSchnorrVirtualAddress(
        address smartAccount
    ) external view returns (address) {
        address schnorrVirtualAddress = smartAccountOwners[smartAccount];
        if (schnorrVirtualAddress == address(0))
            revert NoschnorrVirtualAddressRegisteredForSmartAccount(
                smartAccount
            );
        return schnorrVirtualAddress;
    }

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) external view virtual returns (uint256) {
        (bytes memory signature, ) = abi.decode(
            userOp.signature,
            (bytes, address)
        );
        if (_verifySignature(userOpHash, signature, userOp.sender)) {
            return VALIDATION_SUCCESS;
        }
        return SIG_VALIDATION_FAILED;
    }

    function isValidSignature(
        bytes32 dataHash,
        bytes memory signature
    ) public view virtual override returns (bytes4) {
        return isValidSignatureForAddress(dataHash, signature, msg.sender);
    }

    function isValidSignatureForAddress(
        bytes32 dataHash,
        bytes memory signature,
        address smartAccount
    ) public view virtual returns (bytes4) {
        if (_verifySignature(dataHash, signature, smartAccount)) {
            return ERC1271_MAGICVALUE_BYTES32;
        }
        return bytes4(0xffffffff);
    }

    function _verifySignature(
        bytes32 dataHash,
        bytes memory signature,
        address smartAccount
    ) internal view returns (bool) {
        address expected = smartAccountOwners[smartAccount];
        if (expected == address(0))
            revert NoschnorrVirtualAddressRegisteredForSmartAccount(
                smartAccount
            );

        address recovered = _verifySchnorrSignature(dataHash, signature);

        if (expected == recovered) {
            return true;
        }
        return false;
    }

    function _verifySchnorrSignature(
        bytes32 hash,
        bytes memory sig
    ) internal pure returns (address) {
        // px := public key x-coord
        // e := schnorr signature challenge
        // s := schnorr signature
        // parity := public key y-coord parity (27 or 28)
        (bytes32 px, bytes32 e, bytes32 s, uint8 parity) = abi.decode(
            sig,
            (bytes32, bytes32, bytes32, uint8)
        );
        // ecrecover = (m, v, r, s);
        bytes32 sp = bytes32(Q - mulmod(uint256(s), uint256(px), Q));
        bytes32 ep = bytes32(Q - mulmod(uint256(e), uint256(px), Q));

        require(uint256(sp) != Q);
        // the ecrecover precompile implementation checks that the `r` and `s`
        // inputs are non-zero (in this case, `px` and `ep`), thus we don't need to
        // check if they're zero.
        // ecrecover(hash, v, r, s);
        address R = ecrecover(sp, parity, px, ep);
        require(R != address(0), "ecrecover failed");
        return
            e == keccak256(abi.encodePacked(R, uint8(parity), px, hash))
                ? address(uint160(uint256(px)))
                : address(0);
    }
}
