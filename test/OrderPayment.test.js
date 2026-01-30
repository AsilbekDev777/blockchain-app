const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OrderPayment", function () {
  it("creates order, pays, then releases to seller", async () => {
    const [owner, buyer, seller] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("OrderPayment");
    const c = await Factory.deploy();

    // create
    const tx = await c.connect(buyer).createOrder(seller.address);
    const rc = await tx.wait();
    const orderId = rc.logs[0].args.orderId; // OrderCreated event

    // pay (1 ETH)
    const payValue = ethers.parseEther("1");
    await expect(c.connect(buyer).pay(orderId, { value: payValue }))
      .to.emit(c, "OrderPaid");

    // seller balance before
    const before = await ethers.provider.getBalance(seller.address);

    // release
    await expect(c.connect(buyer).releaseToSeller(orderId))
      .to.emit(c, "Released");

    const after = await ethers.provider.getBalance(seller.address);
    expect(after - before).to.equal(payValue);
  });

  it("owner can refund to buyer", async () => {
    const [owner, buyer, seller] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("OrderPayment");
    const c = await Factory.deploy();

    const tx = await c.connect(buyer).createOrder(seller.address);
    const rc = await tx.wait();
    const orderId = rc.logs[0].args.orderId;

    const payValue = ethers.parseEther("0.5");
    await c.connect(buyer).pay(orderId, { value: payValue });

    const before = await ethers.provider.getBalance(buyer.address);

    await expect(c.connect(owner).refundToBuyer(orderId))
      .to.emit(c, "Refunded");

    const after = await ethers.provider.getBalance(buyer.address);

    // Buyer refund oladi, lekin gas sarflaydi. Shuning uchun >= emas, "katta bo‘lishi kerak" deb tekshiramiz.
    expect(after).to.be.greaterThan(before);
  });

  it("non-owner cannot refund", async () => {
    const [owner, buyer, seller, attacker] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("OrderPayment");
    const c = await Factory.deploy();

    const tx = await c.connect(buyer).createOrder(seller.address);
    const rc = await tx.wait();
    const orderId = rc.logs[0].args.orderId;

    await c.connect(buyer).pay(orderId, { value: ethers.parseEther("0.2") });

    await expect(c.connect(attacker).refundToBuyer(orderId))
      .to.be.revertedWithCustomError(c, "NotOwner");
  });
});
