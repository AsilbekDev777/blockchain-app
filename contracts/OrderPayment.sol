// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OrderPayment {
    enum Status { None, Created, Paid, Refunded, Released }

    struct Order {
        address buyer;
        address seller;
        uint256 amount;
        Status status;
    }

    address public immutable owner;
    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;

    event OrderCreated(uint256 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event OrderPaid(uint256 indexed orderId, uint256 amount);
    event Released(uint256 indexed orderId);
    event Refunded(uint256 indexed orderId);

    error NotOwner();
    error NotBuyer();
    error NotSeller();
    error BadStatus();
    error BadAmount();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createOrder(address seller) external returns (uint256 orderId) {
        if (seller == address(0)) revert ZeroAddress();

        orderId = nextOrderId++;
        orders[orderId] = Order({
            buyer: msg.sender,
            seller: seller,
            amount: 0,
            status: Status.Created
        });

        emit OrderCreated(orderId, msg.sender, seller, 0);
    }

    // Buyer escrowga pul tashlaydi
    function pay(uint256 orderId) external payable {
        Order storage o = orders[orderId];
        if (o.status != Status.Created) revert BadStatus();
        if (msg.sender != o.buyer) revert NotBuyer();
        if (msg.value == 0) revert BadAmount();

        o.amount = msg.value;
        o.status = Status.Paid;

        emit OrderPaid(orderId, msg.value);
    }

    // Buyer tovarni oldim desa, escrowdan sellerga chiqariladi
    function releaseToSeller(uint256 orderId) external {
        Order storage o = orders[orderId];
        if (o.status != Status.Paid) revert BadStatus();
        if (msg.sender != o.buyer) revert NotBuyer();

        o.status = Status.Released;
        (bool ok, ) = o.seller.call{value: o.amount}("");
        require(ok, "transfer failed");

        emit Released(orderId);
    }

    // Disput bo‘lsa owner refund qiladi (sodda variant)
    function refundToBuyer(uint256 orderId) external onlyOwner {
        Order storage o = orders[orderId];
        if (o.status != Status.Paid) revert BadStatus();

        o.status = Status.Refunded;
        (bool ok, ) = o.buyer.call{value: o.amount}("");
        require(ok, "transfer failed");

        emit Refunded(orderId);
    }
}
