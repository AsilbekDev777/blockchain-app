const { ethers } = require("hardhat");

async function main() {
  const OrderPayment = await ethers.getContractFactory("OrderPayment");
  const contract = await OrderPayment.deploy();

  await contract.waitForDeployment();

  console.log("OrderPayment deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
