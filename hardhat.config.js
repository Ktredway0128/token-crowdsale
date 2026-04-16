require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",

  networks: {
    hardhat: {},

    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    sepolia: {
      url: process.env.ALCHEMY_API_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};


// require("dotenv").config();
// require("@nomiclabs/hardhat-ethers");
// require("@nomiclabs/hardhat-waffle");
// require("@nomicfoundation/hardhat-verify");

// /** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: "0.8.19",
//   networks: {
//     sepolia: {
//       url: process.env.ALCHEMY_API_URL,
//       accounts: [process.env.DEPLOYER_PRIVATE_KEY]
//     }
//   },
//   etherscan: {
//     apiKey: process.env.ETHERSCAN_API_KEY
//   }
// };