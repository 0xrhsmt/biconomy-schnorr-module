// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "forge-std/Script.sol";
import "../contracts/modules/SchnorrValidationModule.sol";

contract SchnorrValidationModuleScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        new SchnorrValidationModule{salt: 0}();

        vm.stopBroadcast();
    }
}