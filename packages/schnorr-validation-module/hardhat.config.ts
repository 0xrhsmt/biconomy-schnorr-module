import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-foundry";
import { config as dotEnvConfig } from "dotenv";

dotEnvConfig();

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;

const config: HardhatUserConfig = {
  defaultNetwork: "localhost",
  solidity: "0.8.17",

  networks: {
    localhost: {
      url: "http://localhost:8545",
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [PRIVATE_KEY],
    },
  },
};

export default config;
