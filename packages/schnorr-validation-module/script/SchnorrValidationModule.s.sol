// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "forge-std/Script.sol";
import "../contracts/modules/SchnorrValidationModule.sol";

contract SchnorrValidationModuleScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        uint256 salt = vm.envUint("DEPLOYMENT_SALT");
        new SchnorrValidationModule{salt: bytes32(salt)}();

        vm.stopBroadcast();
    }
}
