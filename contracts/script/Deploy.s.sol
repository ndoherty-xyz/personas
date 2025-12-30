// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/Personas.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        Personas personas = new Personas();
        
        console.log("Personas deployed to:", address(personas));
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Chain ID:", block.chainid);
        
        vm.stopBroadcast();
    }
}