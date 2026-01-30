const { ethers } = require("hardhat");

const CONTRACT_ADDRESS = "0xDEPLOY_QILINGAN_ADDRESS";

async function main() {
  const [buyer] = await ethers.getSigners();
  const contract = await ethers.getContractAt(
    "OrderPayment",
    CONTRACT_ADDRESS
  );

  // 1️⃣ Order yaratish
  const tx1 = await contract.createOrder(buyer.address);
  const rc = await tx1.wait();
  const orderId = rc.logs[0].args.orderId;

  console.log("Order created:", orderId.toString());

  // 2️⃣ Pay (0.01 ETH)
  await contract.pay(orderId, {
    value: ethers.parseEther("0.01"),
  });
  console.log("Paid");

  // 3️⃣ Release
  await contract.releaseToSeller(orderId);
  console.log("Released to seller");
}

main().catch(console.error);
