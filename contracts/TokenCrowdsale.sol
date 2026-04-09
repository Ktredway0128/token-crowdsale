// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract TokenCrowdsale is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    // ===== ROLES =====
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ===== TOKEN =====
    IERC20 public token;

    // ===== SALE CONFIGURATION =====
    uint256 public rate;              // tokens per ETH
    uint256 public hardCap;           // maximum ETH to raise
    uint256 public softCap;           // minimum ETH to raise
    uint256 public minContribution;   // minimum ETH per purchase
    uint256 public maxContribution;   // maximum ETH per wallet
    uint256 public saleStart;         // sale start timestamp
    uint256 public saleEnd;           // sale end timestamp
    uint256 public saleDuration;      // duration in seconds

    // ===== SALE STATE =====
    uint256 public totalRaised;       // total ETH raised
    uint256 public totalTokensSold;   // total tokens sold
    bool public saleStarted;          // has sale been started
    bool public saleFinalized;        // has sale been finalized
    bool public softCapReached;       // has soft cap been met
    bool public hardCapReached;       // has hard cap been met

    // ===== MERKLE WHITELIST =====
    bytes32 public merkleRoot;

    // ===== VESTING =====
    uint256 public vestingDuration;   // how long purchased tokens vest
    uint256 public cliffDuration;     // cliff before any tokens release

    // ===== MAPPINGS =====
    mapping(address => uint256) public contributions;        // ETH contributed per wallet
    mapping(address => uint256) public tokensPurchased;      // tokens bought per wallet
    mapping(address => uint256) public tokensClaimed;        // tokens claimed so far
    mapping(address => bool)    public refundClaimed;        // has refund been claimed
    mapping(address => uint256) public purchaseTimestamp;    // when they purchased

    // ===== EVENTS =====
    event SaleStarted(uint256 startTime, uint256 endTime);
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);
    event TokensClaimed(address indexed buyer, uint256 amount);
    event RefundClaimed(address indexed buyer, uint256 amount);
    event SaleFinalized(bool softCapReached, uint256 totalRaised);
    event MerkleRootUpdated(bytes32 oldRoot, bytes32 newRoot);
    event RateUpdated(uint256 oldRate, uint256 newRate);
    event TokensRecovered(address indexed token, uint256 amount);

    // ===== CONSTRUCTOR =====
    constructor(
        address _token,
        uint256 _rate,
        uint256 _hardCap,
        uint256 _softCap,
        uint256 _minContribution,
        uint256 _maxContribution,
        uint256 _saleDuration,
        uint256 _vestingDuration,
        uint256 _cliffDuration,
        bytes32 _merkleRoot,
        address _admin
    ) {
        require(_token != address(0),               "Invalid token address");
        require(_rate > 0,                          "Rate must be greater than 0");
        require(_hardCap > 0,                       "Hard cap must be greater than 0");
        require(_softCap > 0,                       "Soft cap must be greater than 0");
        require(_softCap < _hardCap,                "Soft cap must be less than hard cap");
        require(_minContribution > 0,                "Min contribution must be greater than 0");
        require(_maxContribution > _minContribution, "Max must be greater than min");
        require(_saleDuration > 0,                   "Sale duration must be greater than 0");
        require(_vestingDuration > 0,               "Vesting duration must be greater than 0");
        require(_merkleRoot != bytes32(0),          "Invalid merkle root");
        require(_admin != address(0),               "Invalid admin address");
        require(_cliffDuration > 0,                 "Cliff duration must be greater than 0");

        token           = IERC20(_token);
        rate            = _rate;
        hardCap         = _hardCap;
        softCap         = _softCap;
        minContribution = _minContribution;
        maxContribution = _maxContribution;
        saleDuration    = _saleDuration;
        vestingDuration = _vestingDuration;
        cliffDuration   = _cliffDuration;
        merkleRoot      = _merkleRoot;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }

    // ===== MODIFIERS =====

    modifier onlyWhileSaleActive() {
        require(saleStarted, "Sale has not started");
        require(!saleFinalized, "Sale has been finalized");
        require(block.timestamp >= saleStart, "Sale has not started yet");
        require(block.timestamp <= saleEnd, "Sale has ended");
        _;
    }

    modifier onlyAfterSaleEnds() {
        require(block.timestamp > saleEnd || saleFinalized, "Sale has not ended");
        _;
    }

    // ===== VIEW FUNCTIONS =====

    function isSaleActive() public view returns (bool) {
        return saleStarted &&
               !saleFinalized &&
               block.timestamp >= saleStart &&
               block.timestamp <= saleEnd;
    }

    function isHardCapReached() public view returns (bool) {
        return totalRaised >= hardCap;
    }

    function isSoftCapReached() public view returns (bool) {
        return totalRaised >= softCap;
    }

    function isWhitelisted(address account, bytes32[] calldata proof) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(account));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    function getContribution(address account) public view returns (uint256) {
        return contributions[account];
    }

    function getVestedAmount(address account) public view returns (uint256) {
        uint256 purchased = tokensPurchased[account];
        if (purchased == 0) return 0;

        uint256 start = purchaseTimestamp[account];
        uint256 cliff = start + cliffDuration;

        if (block.timestamp < cliff) return 0;

        uint256 elapsed = block.timestamp - start;

        if (elapsed >= vestingDuration) {
            return purchased;
        }

        return (purchased * elapsed) / vestingDuration;
    }

    function getClaimableAmount(address account) public view returns (uint256) {
        uint256 vested = getVestedAmount(account);
        return vested - tokensClaimed[account];
    }

    function getRefundAmount(address account) public view returns (uint256) {
        if (isSoftCapReached()) return 0;
        if (refundClaimed[account]) return 0;
        return contributions[account];
    }

    function tokenBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    // ===== USER FUNCTIONS =====

    function buyTokens(bytes32[] calldata proof)
        external
        payable
        nonReentrant
        whenNotPaused
        onlyWhileSaleActive
    {
        // Validate ETH amount
        require(msg.value >= minContribution, "Below minimum contribution");
        require(
            contributions[msg.sender] + msg.value <= maxContribution,
            "Exceeds maximum contribution"
        );

        // Verify whitelist
        require(isWhitelisted(msg.sender, proof), "Not whitelisted");

        // Check hard cap
        require(totalRaised + msg.value <= hardCap, "Exceeds hard cap");

        // Calculate tokens
        uint256 tokenAmount = msg.value * rate;

        // Check contract has enough tokens
        require(tokenBalance() >= tokenAmount, "Insufficient token balance in contract");

        // Record contribution
        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;
        tokensPurchased[msg.sender] += tokenAmount;
        totalTokensSold += tokenAmount;

        // Record purchase timestamp for vesting
        // Only set on first purchase
        if (purchaseTimestamp[msg.sender] == 0) {
            purchaseTimestamp[msg.sender] = block.timestamp;
        }

        // Check if hard cap reached
        if (totalRaised >= hardCap) {
            hardCapReached = true;
        }

        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
    }

    function claimTokens()
        external
        nonReentrant
        onlyAfterSaleEnds
    {
        require(isSoftCapReached(), "Soft cap not reached - claim refund instead");
        require(saleFinalized, "Sale not finalized yet");
        require(tokensPurchased[msg.sender] > 0, "No tokens purchased");

        uint256 claimable = getClaimableAmount(msg.sender);
        require(claimable > 0, "No tokens available to claim");

        tokensClaimed[msg.sender] += claimable;
        token.safeTransfer(msg.sender, claimable);

        emit TokensClaimed(msg.sender, claimable);
    }

    function claimRefund()
        external
        nonReentrant
        onlyAfterSaleEnds
    {
        require(!isSoftCapReached(), "Soft cap reached - no refunds available");
        require(saleFinalized, "Sale not finalized yet");
        require(contributions[msg.sender] > 0, "No contribution found");
        require(!refundClaimed[msg.sender], "Refund already claimed");

        uint256 refundAmount = contributions[msg.sender];
        refundClaimed[msg.sender] = true;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund transfer failed");

        emit RefundClaimed(msg.sender, refundAmount);
    }

    // ===== ADMIN FUNCTIONS =====

    function startSale()
        external
        onlyRole(ADMIN_ROLE)
    {
        require(!saleStarted, "Sale already started");
        require(merkleRoot != bytes32(0), "Merkle root not set");
        require(
            tokenBalance() >= hardCap * rate,
            "Insufficient tokens to cover hard cap"
        );

        saleStarted = true;
        saleStart   = block.timestamp;
        saleEnd     = block.timestamp + saleDuration;

        emit SaleStarted(saleStart, saleEnd);
    }

    function finalizeSale()
        external
        onlyRole(ADMIN_ROLE)
    {
        require(saleStarted, "Sale has not started");
        require(!saleFinalized, "Sale already finalized");
        require(
            block.timestamp > saleEnd || isHardCapReached(),
            "Sale has not ended yet"
        );

        saleFinalized = true;

        if (isSoftCapReached()) {
            softCapReached = true;
        }

        // If soft cap reached send ETH to admin
        if (softCapReached) {
            uint256 balance = address(this).balance;
            (bool success, ) = msg.sender.call{value: balance}("");
            require(success, "ETH transfer failed");
        }

        emit SaleFinalized(softCapReached, totalRaised);
    }

    function updateMerkleRoot(bytes32 newRoot)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(!saleStarted, "Cannot update root after sale starts");
        require(newRoot != bytes32(0), "Invalid merkle root");
        bytes32 oldRoot = merkleRoot;
        merkleRoot = newRoot;
        emit MerkleRootUpdated(oldRoot, newRoot);
    }

    function updateRate(uint256 newRate)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(!saleStarted, "Cannot update rate after sale starts");
        require(newRate > 0, "Rate must be greater than 0");
        uint256 oldRate = rate;
        rate = newRate;
        emit RateUpdated(oldRate, newRate);
    }

    function recoverTokens(address tokenAddress, uint256 amount)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(
            tokenAddress != address(token),
            "Cannot recover sale token"
        );
        IERC20(tokenAddress).safeTransfer(msg.sender, amount);
        emit TokensRecovered(tokenAddress, amount);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function renounceRole(bytes32 role, address account) public override {
    require(role != DEFAULT_ADMIN_ROLE, "Cannot renounce admin role");
    super.renounceRole(role, account);
}
}
