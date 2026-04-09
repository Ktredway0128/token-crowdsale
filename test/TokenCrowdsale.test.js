const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

// ===== HELPERS =====

function buildMerkleTree(addresses) {
    const leaves = addresses.map(addr =>
        keccak256(Buffer.from(addr.slice(2), "hex"))
    );
    return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

function getProof(tree, address) {
    const leaf = keccak256(Buffer.from(address.slice(2), "hex"));
    return tree.getHexProof(leaf);
}

function getRoot(tree) {
    return tree.getHexRoot();
}

// ===== CONSTANTS =====

const RATE             = 1000n;                              // 1000 tokens per ETH
const HARD_CAP         = ethers.utils.parseEther("10");      // 10 ETH hard cap
const SOFT_CAP         = ethers.utils.parseEther("5");       // 5 ETH soft cap
const MIN_CONTRIBUTION = ethers.utils.parseEther("0.1");     // 0.1 ETH minimum
const MAX_CONTRIBUTION = ethers.utils.parseEther("2");       // 2 ETH maximum
const SALE_DURATION    = 7 * 24 * 60 * 60;                  // 7 days
const VESTING_DURATION = 180 * 24 * 60 * 60;                // 180 days
const CLIFF_DURATION   = 30 * 24 * 60 * 60;                 // 30 days

describe("TokenCrowdsale", function () {

    let token;
    let crowdsale;
    let owner;
    let buyer1;
    let buyer2;
    let buyer3;
    let nonWhitelisted;
    let tree;
    let merkleRoot;

    beforeEach(async function () {
        [owner, buyer1, buyer2, buyer3, nonWhitelisted] = await ethers.getSigners();

        // Deploy token
        const Token = await ethers.getContractFactory("SampleToken");
        token = await Token.deploy(
            "Sample Token",
            "STK",
            ethers.utils.parseUnits("1000000", 18),
            ethers.utils.parseUnits("100000", 18)
        );
        await token.deployed();

        // Build merkle tree with whitelisted addresses
        tree = buildMerkleTree([
            buyer1.address,
            buyer2.address,
            buyer3.address
        ]);
        merkleRoot = getRoot(tree);

        // Deploy crowdsale
        const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
        crowdsale = await Crowdsale.deploy(
            token.address,
            RATE,
            HARD_CAP,
            SOFT_CAP,
            MIN_CONTRIBUTION,
            MAX_CONTRIBUTION,
            SALE_DURATION,
            VESTING_DURATION,
            CLIFF_DURATION,
            merkleRoot,
            owner.address
        );
        await crowdsale.deployed();

        // Fund crowdsale with enough tokens to cover hard cap
        const tokensNeeded = HARD_CAP.mul(RATE);
        await token.transfer(crowdsale.address, tokensNeeded);
    });

    // ===== DEPLOYMENT =====

    describe("Deployment", function () {

        it("Should set the correct token address", async function () {
            expect(await crowdsale.token()).to.equal(token.address);
        });

        it("Should set the correct rate", async function () {
            expect(await crowdsale.rate()).to.equal(RATE);
        });

        it("Should set the correct hard cap", async function () {
            expect(await crowdsale.hardCap()).to.equal(HARD_CAP);
        });

        it("Should set the correct soft cap", async function () {
            expect(await crowdsale.softCap()).to.equal(SOFT_CAP);
        });

        it("Should set the correct min contribution", async function () {
            expect(await crowdsale.minContribution()).to.equal(MIN_CONTRIBUTION);
        });

        it("Should set the correct max contribution", async function () {
            expect(await crowdsale.maxContribution()).to.equal(MAX_CONTRIBUTION);
        });

        it("Should set the correct sale duration", async function () {
            expect(await crowdsale.saleDuration()).to.equal(SALE_DURATION);
        });

        it("Should set the correct vesting duration", async function () {
            expect(await crowdsale.vestingDuration()).to.equal(VESTING_DURATION);
        });

        it("Should set the correct cliff duration", async function () {
            expect(await crowdsale.cliffDuration()).to.equal(CLIFF_DURATION);
        });

        it("Should set the correct merkle root", async function () {
            expect(await crowdsale.merkleRoot()).to.equal(merkleRoot);
        });

        it("Should grant admin role to owner", async function () {
            const ADMIN_ROLE = await crowdsale.ADMIN_ROLE();
            expect(await crowdsale.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("Should start with sale not started", async function () {
            expect(await crowdsale.saleStarted()).to.be.false;
        });

        it("Should start with sale not finalized", async function () {
            expect(await crowdsale.saleFinalized()).to.be.false;
        });

        it("Should start with zero total raised", async function () {
            expect(await crowdsale.totalRaised()).to.equal(0);
        });

        it("Should start with zero total tokens sold", async function () {
            expect(await crowdsale.totalTokensSold()).to.equal(0);
        });

        it("Should revert with invalid token address", async function () {
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            await expect(Crowdsale.deploy(
                ethers.constants.AddressZero,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, merkleRoot, owner.address
            )).to.be.revertedWith("Invalid token address");
        });

        it("Should revert with zero rate", async function () {
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            await expect(Crowdsale.deploy(
                token.address,
                0, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, merkleRoot, owner.address
            )).to.be.revertedWith("Rate must be greater than 0");
        });

        it("Should revert when soft cap exceeds hard cap", async function () {
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            await expect(Crowdsale.deploy(
                token.address,
                RATE,
                SOFT_CAP,
                HARD_CAP,
                MIN_CONTRIBUTION,
                MAX_CONTRIBUTION,
                SALE_DURATION,
                VESTING_DURATION,
                CLIFF_DURATION,
                merkleRoot,
                owner.address
            )).to.be.revertedWith("Soft cap must be less than hard cap");
        });

        it("Should revert with zero cliff duration", async function () {
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            await expect(Crowdsale.deploy(
                token.address,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                0, merkleRoot, owner.address
            )).to.be.revertedWith("Cliff duration must be greater than 0");
        });

        it("Should revert with invalid admin address", async function () {
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            await expect(Crowdsale.deploy(
                token.address,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, merkleRoot,
                ethers.constants.AddressZero
            )).to.be.revertedWith("Invalid admin address");
        });

    });

    // ===== START SALE =====

    describe("startSale", function () {

        it("Should start the sale successfully", async function () {
            await crowdsale.startSale();
            expect(await crowdsale.saleStarted()).to.be.true;
        });

        it("Should set saleStart timestamp", async function () {
            await crowdsale.startSale();
            expect(await crowdsale.saleStart()).to.be.gt(0);
        });

        it("Should set saleEnd timestamp correctly", async function () {
            await crowdsale.startSale();
            const saleStart = await crowdsale.saleStart();
            const saleEnd = await crowdsale.saleEnd();
            expect(saleEnd).to.equal(saleStart.add(SALE_DURATION));
        });

        it("Should emit SaleStarted event", async function () {
            await expect(crowdsale.startSale())
                .to.emit(crowdsale, "SaleStarted");
        });

        it("Should revert if sale already started", async function () {
            await crowdsale.startSale();
            await expect(crowdsale.startSale())
                .to.be.revertedWith("Sale already started");
        });

        it("Should revert if non admin tries to start sale", async function () {
            await expect(crowdsale.connect(buyer1).startSale())
                .to.be.reverted;
        });

        it("Should revert if contract has insufficient tokens", async function () {
            // Deploy fresh crowdsale without funding it
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            const unfundedCrowdsale = await Crowdsale.deploy(
                token.address,
                RATE,
                HARD_CAP,
                SOFT_CAP,
                MIN_CONTRIBUTION,
                MAX_CONTRIBUTION,
                SALE_DURATION,
                VESTING_DURATION,
                CLIFF_DURATION,
                merkleRoot,
                owner.address
            );
            await unfundedCrowdsale.deployed();

            await expect(unfundedCrowdsale.startSale())
                .to.be.revertedWith("Insufficient tokens to cover hard cap");
        });

        it("Should show sale as active after starting", async function () {
            await crowdsale.startSale();
            expect(await crowdsale.isSaleActive()).to.be.true;
        });

        it("Should show sale as inactive before starting", async function () {
            expect(await crowdsale.isSaleActive()).to.be.false;
        });

    });

    // ===== BUY TOKENS =====

    describe("buyTokens", function () {

        beforeEach(async function () {
            await crowdsale.startSale();
        });

        it("Should allow whitelisted buyer to purchase tokens", async function () {
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, {
                value: MIN_CONTRIBUTION
            });
            expect(await crowdsale.contributions(buyer1.address)).to.equal(MIN_CONTRIBUTION);
        });

        it("Should record correct token amount purchased", async function () {
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, {
                value: MIN_CONTRIBUTION
            });
            const expectedTokens = MIN_CONTRIBUTION.mul(RATE);
            expect(await crowdsale.tokensPurchased(buyer1.address)).to.equal(expectedTokens);
        });

        it("Should update totalRaised correctly", async function () {
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, {
                value: MIN_CONTRIBUTION
            });
            expect(await crowdsale.totalRaised()).to.equal(MIN_CONTRIBUTION);
        });

        it("Should update totalTokensSold correctly", async function () {
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, {
                value: MIN_CONTRIBUTION
            });
            const expectedTokens = MIN_CONTRIBUTION.mul(RATE);
            expect(await crowdsale.totalTokensSold()).to.equal(expectedTokens);
        });

        it("Should set purchase timestamp on first purchase", async function () {
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, {
                value: MIN_CONTRIBUTION
            });
            expect(await crowdsale.purchaseTimestamp(buyer1.address)).to.be.gt(0);
        });

        it("Should not update purchase timestamp on second purchase", async function () {
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, {
                value: MIN_CONTRIBUTION
            });
            const firstTimestamp = await crowdsale.purchaseTimestamp(buyer1.address);

            await ethers.provider.send("evm_increaseTime", [3600]);
            await ethers.provider.send("evm_mine");

            await crowdsale.connect(buyer1).buyTokens(proof, {
                value: MIN_CONTRIBUTION
            });
            expect(await crowdsale.purchaseTimestamp(buyer1.address)).to.equal(firstTimestamp);
        });

        it("Should emit TokensPurchased event", async function () {
            const proof = getProof(tree, buyer1.address);
            await expect(
                crowdsale.connect(buyer1).buyTokens(proof, { value: MIN_CONTRIBUTION })
            ).to.emit(crowdsale, "TokensPurchased");
        });

        it("Should revert if below minimum contribution", async function () {
            const proof = getProof(tree, buyer1.address);
            await expect(
                crowdsale.connect(buyer1).buyTokens(proof, {
                    value: ethers.utils.parseEther("0.05")
                })
            ).to.be.revertedWith("Below minimum contribution");
        });

        it("Should revert if exceeds maximum contribution", async function () {
            const proof = getProof(tree, buyer1.address);
            await expect(
                crowdsale.connect(buyer1).buyTokens(proof, {
                    value: ethers.utils.parseEther("3")
                })
            ).to.be.revertedWith("Exceeds maximum contribution");
        });

        it("Should revert if cumulative contribution exceeds max", async function () {
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, {
                value: ethers.utils.parseEther("1.5")
            });
            await expect(
                crowdsale.connect(buyer1).buyTokens(proof, {
                    value: ethers.utils.parseEther("1")
                })
            ).to.be.revertedWith("Exceeds maximum contribution");
        });

        it("Should revert if not whitelisted", async function () {
            const proof = getProof(tree, nonWhitelisted.address);
            await expect(
                crowdsale.connect(nonWhitelisted).buyTokens(proof, {
                    value: MIN_CONTRIBUTION
                })
            ).to.be.revertedWith("Not whitelisted");
        });

        it("Should revert if sale has not started", async function () {
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            const newCrowdsale = await Crowdsale.deploy(
                token.address,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, merkleRoot, owner.address
            );
            await newCrowdsale.deployed();
            const tokensNeeded = HARD_CAP.mul(RATE);
            await token.transfer(newCrowdsale.address, tokensNeeded);

            const proof = getProof(tree, buyer1.address);
            await expect(
                newCrowdsale.connect(buyer1).buyTokens(proof, {
                    value: MIN_CONTRIBUTION
                })
            ).to.be.revertedWith("Sale has not started");
        });

        it("Should revert if sale has ended", async function () {
            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            const proof = getProof(tree, buyer1.address);
            await expect(
                crowdsale.connect(buyer1).buyTokens(proof, {
                    value: MIN_CONTRIBUTION
                })
            ).to.be.revertedWith("Sale has ended");
        });

        it("Should revert if hard cap would be exceeded", async function () {
            const proof1 = getProof(tree, buyer1.address);
            const proof2 = getProof(tree, buyer2.address);
            const proof3 = getProof(tree, buyer3.address);

            await crowdsale.connect(buyer1).buyTokens(proof1, {
                value: MAX_CONTRIBUTION
            });
            await crowdsale.connect(buyer2).buyTokens(proof2, {
                value: MAX_CONTRIBUTION
            });
            await crowdsale.connect(buyer3).buyTokens(proof3, {
                value: MAX_CONTRIBUTION
            });

            // Add more buyers to approach hard cap
            const [,,,,, buyer4, buyer5, buyer6] = await ethers.getSigners();
            const newTree = buildMerkleTree([
                buyer1.address,
                buyer2.address,
                buyer3.address,
                buyer4.address,
                buyer5.address,
                buyer6.address
            ]);
            const newRoot = getRoot(newTree);

            // Deploy fresh crowdsale with updated tree
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            const newCrowdsale = await Crowdsale.deploy(
                token.address,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, newRoot, owner.address
            );
            await newCrowdsale.deployed();
            const tokensNeeded = HARD_CAP.mul(RATE);
            await token.transfer(newCrowdsale.address, tokensNeeded);
            await newCrowdsale.startSale();

            const p1 = getProof(newTree, buyer1.address);
            const p2 = getProof(newTree, buyer2.address);
            const p3 = getProof(newTree, buyer3.address);
            const p4 = getProof(newTree, buyer4.address);
            const p5 = getProof(newTree, buyer5.address);
            const p6 = getProof(newTree, buyer6.address);

            await newCrowdsale.connect(buyer1).buyTokens(p1, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer2).buyTokens(p2, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer3).buyTokens(p3, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer4).buyTokens(p4, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer5).buyTokens(p5, { value: MAX_CONTRIBUTION });

            await expect(
                newCrowdsale.connect(buyer6).buyTokens(p6, { value: MAX_CONTRIBUTION })
            ).to.be.revertedWith("Exceeds hard cap");
        });

        it("Should set hardCapReached when hard cap is hit", async function () {
            const [,,,,, buyer4, buyer5] = await ethers.getSigners();
            const newTree = buildMerkleTree([
                buyer1.address,
                buyer2.address,
                buyer3.address,
                buyer4.address,
                buyer5.address
            ]);
            const newRoot = getRoot(newTree);

            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            const newCrowdsale = await Crowdsale.deploy(
                token.address,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, newRoot, owner.address
            );
            await newCrowdsale.deployed();
            const tokensNeeded = HARD_CAP.mul(RATE);
            await token.transfer(newCrowdsale.address, tokensNeeded);
            await newCrowdsale.startSale();

            const p1 = getProof(newTree, buyer1.address);
            const p2 = getProof(newTree, buyer2.address);
            const p3 = getProof(newTree, buyer3.address);
            const p4 = getProof(newTree, buyer4.address);
            const p5 = getProof(newTree, buyer5.address);

            await newCrowdsale.connect(buyer1).buyTokens(p1, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer2).buyTokens(p2, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer3).buyTokens(p3, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer4).buyTokens(p4, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer5).buyTokens(p5, { value: MAX_CONTRIBUTION });

            expect(await newCrowdsale.hardCapReached()).to.be.true;
        });

        it("Should revert when paused", async function () {
            await crowdsale.pause();
            const proof = getProof(tree, buyer1.address);
            await expect(
                crowdsale.connect(buyer1).buyTokens(proof, {
                    value: MIN_CONTRIBUTION
                })
            ).to.be.reverted;
        });

    });

    // ===== CLAIM TOKENS =====

    describe("claimTokens", function () {

        beforeEach(async function () {
            await crowdsale.startSale();
        
            // buyer1 purchases tokens
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, {
                value: MAX_CONTRIBUTION
            });
        
            // buyer2 purchases tokens
            const proof2 = getProof(tree, buyer2.address);
            await crowdsale.connect(buyer2).buyTokens(proof2, {
                value: MAX_CONTRIBUTION
            });
        
            // buyer3 purchases tokens
            const proof3 = getProof(tree, buyer3.address);
            await crowdsale.connect(buyer3).buyTokens(proof3, {
                value: MAX_CONTRIBUTION
            });
        
            // Advance time past sale end
            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");
        
            // Finalize sale
            await crowdsale.finalizeSale();
        });

        it("Should revert before cliff period ends", async function () {
            await expect(
                crowdsale.connect(buyer1).claimTokens()
            ).to.be.revertedWith("No tokens available to claim");
        });

        it("Should return zero claimable before cliff", async function () {
            expect(await crowdsale.getClaimableAmount(buyer1.address)).to.equal(0);
        });

        it("Should allow claim after cliff period", async function () {
            // Advance past cliff
            await ethers.provider.send("evm_increaseTime", [CLIFF_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            const claimable = await crowdsale.getClaimableAmount(buyer1.address);
            expect(claimable).to.be.gt(0);
        });

        it("Should claim correct partial amount after cliff", async function () {
            await ethers.provider.send("evm_increaseTime", [CLIFF_DURATION + 1]);
            await ethers.provider.send("evm_mine");
        
            await crowdsale.connect(buyer1).claimTokens();
            expect(await token.balanceOf(buyer1.address)).to.be.gt(0);
        });

        it("Should update tokensClaimed after claiming", async function () {
            await ethers.provider.send("evm_increaseTime", [CLIFF_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await crowdsale.connect(buyer1).claimTokens();
            expect(await crowdsale.tokensClaimed(buyer1.address)).to.be.gt(0);
        });

        it("Should allow full claim after full vesting duration", async function () {
            await ethers.provider.send("evm_increaseTime", [VESTING_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            const purchased = await crowdsale.tokensPurchased(buyer1.address);
            await crowdsale.connect(buyer1).claimTokens();
            expect(await token.balanceOf(buyer1.address)).to.equal(purchased);
        });

        it("Should allow multiple partial claims over time", async function () {
            // First claim after cliff
            await ethers.provider.send("evm_increaseTime", [CLIFF_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await crowdsale.connect(buyer1).claimTokens();
            const firstBalance = await token.balanceOf(buyer1.address);
            expect(firstBalance).to.be.gt(0);

            // Second claim after more time passes
            await ethers.provider.send("evm_increaseTime", [CLIFF_DURATION]);
            await ethers.provider.send("evm_mine");

            await crowdsale.connect(buyer1).claimTokens();
            const secondBalance = await token.balanceOf(buyer1.address);
            expect(secondBalance).to.be.gt(firstBalance);
        });

        it("Should emit TokensClaimed event", async function () {
            await ethers.provider.send("evm_increaseTime", [CLIFF_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await expect(crowdsale.connect(buyer1).claimTokens())
                .to.emit(crowdsale, "TokensClaimed");
        });

        it("Should revert if no tokens purchased", async function () {
            await ethers.provider.send("evm_increaseTime", [CLIFF_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await expect(
                crowdsale.connect(nonWhitelisted).claimTokens()
            ).to.be.revertedWith("No tokens purchased");
        });

        it("Should revert if sale not finalized", async function () {
            // Deploy fresh sale
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            const newCrowdsale = await Crowdsale.deploy(
                token.address,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, merkleRoot, owner.address
            );
            await newCrowdsale.deployed();
            const tokensNeeded = HARD_CAP.mul(RATE);
            await token.transfer(newCrowdsale.address, tokensNeeded);
            await newCrowdsale.startSale();

            const proof = getProof(tree, buyer1.address);
            await newCrowdsale.connect(buyer1).buyTokens(proof, {
                value: MAX_CONTRIBUTION
            });
            const proof2 = getProof(tree, buyer2.address);
            await newCrowdsale.connect(buyer2).buyTokens(proof2, {
                value: MAX_CONTRIBUTION
            });
            const proof3 = getProof(tree, buyer3.address);
            await newCrowdsale.connect(buyer3).buyTokens(proof3, {
                value: MAX_CONTRIBUTION
            });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + CLIFF_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await expect(
                newCrowdsale.connect(buyer1).claimTokens()
            ).to.be.revertedWith("Sale not finalized yet");
        });

        it("Should revert if soft cap not reached", async function () {
            // Deploy fresh sale where soft cap is not reached
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            const newCrowdsale = await Crowdsale.deploy(
                token.address,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, merkleRoot, owner.address
            );
            await newCrowdsale.deployed();
            const tokensNeeded = HARD_CAP.mul(RATE);
            await token.transfer(newCrowdsale.address, tokensNeeded);
            await newCrowdsale.startSale();

            const proof = getProof(tree, buyer1.address);
            await newCrowdsale.connect(buyer1).buyTokens(proof, {
                value: MIN_CONTRIBUTION
            });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + CLIFF_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await newCrowdsale.finalizeSale();

            await expect(
                newCrowdsale.connect(buyer1).claimTokens()
            ).to.be.revertedWith("Soft cap not reached - claim refund instead");
        });

    });

    // ===== CLAIM REFUND =====

    describe("claimRefund", function () {

        beforeEach(async function () {
            await crowdsale.startSale();

            // buyer1 purchases tokens but soft cap is NOT reached
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, {
                value: MIN_CONTRIBUTION
            });

            // Advance time past sale end
            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            // Finalize sale
            await crowdsale.finalizeSale();
        });

        it("Should allow refund when soft cap not reached", async function () {
            const balanceBefore = await ethers.provider.getBalance(buyer1.address);
            await crowdsale.connect(buyer1).claimRefund();
            const balanceAfter = await ethers.provider.getBalance(buyer1.address);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it("Should refund correct ETH amount", async function () {
            const contribution = await crowdsale.contributions(buyer1.address);
            const balanceBefore = await ethers.provider.getBalance(buyer1.address);
            const tx = await crowdsale.connect(buyer1).claimRefund();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed.mul(tx.gasPrice);
            const balanceAfter = await ethers.provider.getBalance(buyer1.address);
            expect(balanceAfter).to.equal(balanceBefore.add(contribution).sub(gasUsed));
        });

        it("Should set refundClaimed to true", async function () {
            await crowdsale.connect(buyer1).claimRefund();
            expect(await crowdsale.refundClaimed(buyer1.address)).to.be.true;
        });

        it("Should emit RefundClaimed event", async function () {
            await expect(crowdsale.connect(buyer1).claimRefund())
                .to.emit(crowdsale, "RefundClaimed");
        });

        it("Should revert if refund already claimed", async function () {
            await crowdsale.connect(buyer1).claimRefund();
            await expect(
                crowdsale.connect(buyer1).claimRefund()
            ).to.be.revertedWith("Refund already claimed");
        });

        it("Should revert if no contribution found", async function () {
            await expect(
                crowdsale.connect(buyer2).claimRefund()
            ).to.be.revertedWith("No contribution found");
        });

        it("Should revert if soft cap was reached", async function () {
            // Deploy fresh sale and hit soft cap
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            const newCrowdsale = await Crowdsale.deploy(
                token.address,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, merkleRoot, owner.address
            );
            await newCrowdsale.deployed();
            const tokensNeeded = HARD_CAP.mul(RATE);
            await token.transfer(newCrowdsale.address, tokensNeeded);
            await newCrowdsale.startSale();

            const proof1 = getProof(tree, buyer1.address);
            const proof2 = getProof(tree, buyer2.address);
            const proof3 = getProof(tree, buyer3.address);

            await newCrowdsale.connect(buyer1).buyTokens(proof1, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer2).buyTokens(proof2, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer3).buyTokens(proof3, { value: MAX_CONTRIBUTION });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await newCrowdsale.finalizeSale();

            await expect(
                newCrowdsale.connect(buyer1).claimRefund()
            ).to.be.revertedWith("Soft cap reached - no refunds available");
        });

        it("Should revert if sale not finalized", async function () {
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            const newCrowdsale = await Crowdsale.deploy(
                token.address,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, merkleRoot, owner.address
            );
            await newCrowdsale.deployed();
            const tokensNeeded = HARD_CAP.mul(RATE);
            await token.transfer(newCrowdsale.address, tokensNeeded);
            await newCrowdsale.startSale();

            const proof = getProof(tree, buyer1.address);
            await newCrowdsale.connect(buyer1).buyTokens(proof, {
                value: MIN_CONTRIBUTION
            });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await expect(
                newCrowdsale.connect(buyer1).claimRefund()
            ).to.be.revertedWith("Sale not finalized yet");
        });

        it("Should return zero refund amount if soft cap reached", async function () {
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            const newCrowdsale = await Crowdsale.deploy(
                token.address,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, merkleRoot, owner.address
            );
            await newCrowdsale.deployed();
            const tokensNeeded = HARD_CAP.mul(RATE);
            await token.transfer(newCrowdsale.address, tokensNeeded);
            await newCrowdsale.startSale();

            const proof1 = getProof(tree, buyer1.address);
            const proof2 = getProof(tree, buyer2.address);
            const proof3 = getProof(tree, buyer3.address);

            await newCrowdsale.connect(buyer1).buyTokens(proof1, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer2).buyTokens(proof2, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer3).buyTokens(proof3, { value: MAX_CONTRIBUTION });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await newCrowdsale.finalizeSale();

            expect(await newCrowdsale.getRefundAmount(buyer1.address)).to.equal(0);
        });

    });

    // ===== FINALIZE SALE =====

    describe("finalizeSale", function () {

        it("Should finalize sale after time expires", async function () {
            await crowdsale.startSale();

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await crowdsale.finalizeSale();
            expect(await crowdsale.saleFinalized()).to.be.true;
        });

        it("Should finalize sale when hard cap is reached", async function () {
            const [,,,,, buyer4, buyer5] = await ethers.getSigners();
            const newTree = buildMerkleTree([
                buyer1.address,
                buyer2.address,
                buyer3.address,
                buyer4.address,
                buyer5.address
            ]);
            const newRoot = getRoot(newTree);

            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            const newCrowdsale = await Crowdsale.deploy(
                token.address,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, newRoot, owner.address
            );
            await newCrowdsale.deployed();
            const tokensNeeded = HARD_CAP.mul(RATE);
            await token.transfer(newCrowdsale.address, tokensNeeded);
            await newCrowdsale.startSale();

            const p1 = getProof(newTree, buyer1.address);
            const p2 = getProof(newTree, buyer2.address);
            const p3 = getProof(newTree, buyer3.address);
            const p4 = getProof(newTree, buyer4.address);
            const p5 = getProof(newTree, buyer5.address);

            await newCrowdsale.connect(buyer1).buyTokens(p1, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer2).buyTokens(p2, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer3).buyTokens(p3, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer4).buyTokens(p4, { value: MAX_CONTRIBUTION });
            await newCrowdsale.connect(buyer5).buyTokens(p5, { value: MAX_CONTRIBUTION });

            await newCrowdsale.finalizeSale();
            expect(await newCrowdsale.saleFinalized()).to.be.true;
        });

        it("Should set softCapReached to true when soft cap met", async function () {
            await crowdsale.startSale();

            const proof1 = getProof(tree, buyer1.address);
            const proof2 = getProof(tree, buyer2.address);
            const proof3 = getProof(tree, buyer3.address);

            await crowdsale.connect(buyer1).buyTokens(proof1, { value: MAX_CONTRIBUTION });
            await crowdsale.connect(buyer2).buyTokens(proof2, { value: MAX_CONTRIBUTION });
            await crowdsale.connect(buyer3).buyTokens(proof3, { value: MAX_CONTRIBUTION });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await crowdsale.finalizeSale();
            expect(await crowdsale.softCapReached()).to.be.true;
        });

        it("Should not set softCapReached when soft cap not met", async function () {
            await crowdsale.startSale();

            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, { value: MIN_CONTRIBUTION });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await crowdsale.finalizeSale();
            expect(await crowdsale.softCapReached()).to.be.false;
        });

        it("Should transfer ETH to admin when soft cap reached", async function () {
            await crowdsale.startSale();

            const proof1 = getProof(tree, buyer1.address);
            const proof2 = getProof(tree, buyer2.address);
            const proof3 = getProof(tree, buyer3.address);

            await crowdsale.connect(buyer1).buyTokens(proof1, { value: MAX_CONTRIBUTION });
            await crowdsale.connect(buyer2).buyTokens(proof2, { value: MAX_CONTRIBUTION });
            await crowdsale.connect(buyer3).buyTokens(proof3, { value: MAX_CONTRIBUTION });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            const balanceBefore = await ethers.provider.getBalance(owner.address);
            await crowdsale.finalizeSale();
            const balanceAfter = await ethers.provider.getBalance(owner.address);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it("Should keep ETH in contract when soft cap not reached", async function () {
            await crowdsale.startSale();

            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, { value: MIN_CONTRIBUTION });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await crowdsale.finalizeSale();
            const contractBalance = await ethers.provider.getBalance(crowdsale.address);
            expect(contractBalance).to.equal(MIN_CONTRIBUTION);
        });

        it("Should emit SaleFinalized event", async function () {
            await crowdsale.startSale();

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await expect(crowdsale.finalizeSale())
                .to.emit(crowdsale, "SaleFinalized");
        });

        it("Should revert if sale has not started", async function () {
            await expect(crowdsale.finalizeSale())
                .to.be.revertedWith("Sale has not started");
        });

        it("Should revert if sale already finalized", async function () {
            await crowdsale.startSale();

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await crowdsale.finalizeSale();
            await expect(crowdsale.finalizeSale())
                .to.be.revertedWith("Sale already finalized");
        });

        it("Should revert if sale has not ended yet", async function () {
            await crowdsale.startSale();

            await expect(crowdsale.finalizeSale())
                .to.be.revertedWith("Sale has not ended yet");
        });

        it("Should revert if non admin tries to finalize", async function () {
            await crowdsale.startSale();

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await expect(crowdsale.connect(buyer1).finalizeSale())
                .to.be.reverted;
        });

    });

    // ===== ADMIN FUNCTIONS =====

    describe("updateMerkleRoot", function () {

        it("Should update merkle root before sale starts", async function () {
            const newTree = buildMerkleTree([buyer1.address, buyer2.address]);
            const newRoot = getRoot(newTree);
            await crowdsale.updateMerkleRoot(newRoot);
            expect(await crowdsale.merkleRoot()).to.equal(newRoot);
        });

        it("Should emit MerkleRootUpdated event", async function () {
            const newTree = buildMerkleTree([buyer1.address, buyer2.address]);
            const newRoot = getRoot(newTree);
            await expect(crowdsale.updateMerkleRoot(newRoot))
                .to.emit(crowdsale, "MerkleRootUpdated");
        });

        it("Should revert if sale already started", async function () {
            await crowdsale.startSale();
            const newTree = buildMerkleTree([buyer1.address]);
            const newRoot = getRoot(newTree);
            await expect(crowdsale.updateMerkleRoot(newRoot))
                .to.be.revertedWith("Cannot update root after sale starts");
        });

        it("Should revert with invalid merkle root", async function () {
            await expect(crowdsale.updateMerkleRoot(ethers.constants.HashZero))
                .to.be.revertedWith("Invalid merkle root");
        });

        it("Should revert if non admin calls", async function () {
            const newTree = buildMerkleTree([buyer1.address]);
            const newRoot = getRoot(newTree);
            await expect(crowdsale.connect(buyer1).updateMerkleRoot(newRoot))
                .to.be.reverted;
        });

    });

    describe("updateRate", function () {

        it("Should update rate before sale starts", async function () {
            await crowdsale.updateRate(2000);
            expect(await crowdsale.rate()).to.equal(2000);
        });

        it("Should emit RateUpdated event", async function () {
            await expect(crowdsale.updateRate(2000))
                .to.emit(crowdsale, "RateUpdated");
        });

        it("Should revert if sale already started", async function () {
            await crowdsale.startSale();
            await expect(crowdsale.updateRate(2000))
                .to.be.revertedWith("Cannot update rate after sale starts");
        });

        it("Should revert with zero rate", async function () {
            await expect(crowdsale.updateRate(0))
                .to.be.revertedWith("Rate must be greater than 0");
        });

        it("Should revert if non admin calls", async function () {
            await expect(crowdsale.connect(buyer1).updateRate(2000))
                .to.be.reverted;
        });

    });

    describe("recoverTokens", function () {

        it("Should recover accidentally sent tokens", async function () {
            const MockToken = await ethers.getContractFactory("SampleToken");
            const mockToken = await MockToken.deploy(
                "Mock Token",
                "MOCK",
                ethers.utils.parseUnits("1000000", 18),
                ethers.utils.parseUnits("1000", 18)
            );
            await mockToken.deployed();

            await mockToken.transfer(crowdsale.address, ethers.utils.parseUnits("100", 18));
            await crowdsale.recoverTokens(mockToken.address, ethers.utils.parseUnits("100", 18));

            expect(await mockToken.balanceOf(owner.address)).to.equal(
                ethers.utils.parseUnits("1000", 18)
            );
        });

        it("Should emit TokensRecovered event", async function () {
            const MockToken = await ethers.getContractFactory("SampleToken");
            const mockToken = await MockToken.deploy(
                "Mock Token",
                "MOCK",
                ethers.utils.parseUnits("1000000", 18),
                ethers.utils.parseUnits("1000", 18)
            );
            await mockToken.deployed();

            await mockToken.transfer(crowdsale.address, ethers.utils.parseUnits("100", 18));
            await expect(
                crowdsale.recoverTokens(mockToken.address, ethers.utils.parseUnits("100", 18))
            ).to.emit(crowdsale, "TokensRecovered");
        });

        it("Should revert if trying to recover sale token", async function () {
            await expect(
                crowdsale.recoverTokens(token.address, ethers.utils.parseUnits("100", 18))
            ).to.be.revertedWith("Cannot recover sale token");
        });

        it("Should revert if non admin calls", async function () {
            await expect(
                crowdsale.connect(buyer1).recoverTokens(
                    token.address,
                    ethers.utils.parseUnits("100", 18)
                )
            ).to.be.reverted;
        });

    });

    describe("pause and unpause", function () {

        it("Should pause the contract", async function () {
            await crowdsale.pause();
            expect(await crowdsale.paused()).to.be.true;
        });

        it("Should unpause the contract", async function () {
            await crowdsale.pause();
            await crowdsale.unpause();
            expect(await crowdsale.paused()).to.be.false;
        });

        it("Should revert if non admin tries to pause", async function () {
            await expect(crowdsale.connect(buyer1).pause())
                .to.be.reverted;
        });

        it("Should revert if non admin tries to unpause", async function () {
            await crowdsale.pause();
            await expect(crowdsale.connect(buyer1).unpause())
                .to.be.reverted;
        });

        it("Should prevent buying when paused", async function () {
            await crowdsale.startSale();
            await crowdsale.pause();
            const proof = getProof(tree, buyer1.address);
            await expect(
                crowdsale.connect(buyer1).buyTokens(proof, { value: MIN_CONTRIBUTION })
            ).to.be.reverted;
        });

    });

    // ===== VIEW FUNCTIONS =====

    describe("View Functions", function () {

        it("Should return correct token balance", async function () {
            const tokensNeeded = HARD_CAP.mul(RATE);
            expect(await crowdsale.tokenBalance()).to.equal(tokensNeeded);
        });

        it("Should return correct contribution amount", async function () {
            await crowdsale.startSale();
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, { value: MIN_CONTRIBUTION });
            expect(await crowdsale.getContribution(buyer1.address)).to.equal(MIN_CONTRIBUTION);
        });

        it("Should return zero contribution for non buyer", async function () {
            expect(await crowdsale.getContribution(buyer1.address)).to.equal(0);
        });

        it("Should return correct whitelist status for whitelisted address", async function () {
            const proof = getProof(tree, buyer1.address);
            expect(await crowdsale.isWhitelisted(buyer1.address, proof)).to.be.true;
        });

        it("Should return false for non whitelisted address", async function () {
            const proof = getProof(tree, nonWhitelisted.address);
            expect(await crowdsale.isWhitelisted(nonWhitelisted.address, proof)).to.be.false;
        });

        it("Should return zero vested amount before purchase", async function () {
            expect(await crowdsale.getVestedAmount(buyer1.address)).to.equal(0);
        });

        it("Should return zero claimable amount before purchase", async function () {
            expect(await crowdsale.getClaimableAmount(buyer1.address)).to.equal(0);
        });

        it("Should return zero refund amount for non buyer", async function () {
            expect(await crowdsale.getRefundAmount(buyer1.address)).to.equal(0);
        });

        it("Should return false for isSaleActive before start", async function () {
            expect(await crowdsale.isSaleActive()).to.be.false;
        });

        it("Should return true for isSaleActive after start", async function () {
            await crowdsale.startSale();
            expect(await crowdsale.isSaleActive()).to.be.true;
        });

        it("Should return false for isSaleActive after sale ends", async function () {
            await crowdsale.startSale();
            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");
            expect(await crowdsale.isSaleActive()).to.be.false;
        });

        it("Should return false for isSoftCapReached initially", async function () {
            expect(await crowdsale.isSoftCapReached()).to.be.false;
        });

        it("Should return true for isSoftCapReached when met", async function () {
            await crowdsale.startSale();
            const proof1 = getProof(tree, buyer1.address);
            const proof2 = getProof(tree, buyer2.address);
            const proof3 = getProof(tree, buyer3.address);
            await crowdsale.connect(buyer1).buyTokens(proof1, { value: MAX_CONTRIBUTION });
            await crowdsale.connect(buyer2).buyTokens(proof2, { value: MAX_CONTRIBUTION });
            await crowdsale.connect(buyer3).buyTokens(proof3, { value: MAX_CONTRIBUTION });
            expect(await crowdsale.isSoftCapReached()).to.be.true;
        });

        it("Should return false for isHardCapReached initially", async function () {
            expect(await crowdsale.isHardCapReached()).to.be.false;
        });

    });

    // ===== EDGE CASES =====

    describe("Edge Cases", function () {

        it("Should handle multiple buyers purchasing up to their max", async function () {
            await crowdsale.startSale();
            const proof1 = getProof(tree, buyer1.address);
            const proof2 = getProof(tree, buyer2.address);
            const proof3 = getProof(tree, buyer3.address);

            await crowdsale.connect(buyer1).buyTokens(proof1, { value: MAX_CONTRIBUTION });
            await crowdsale.connect(buyer2).buyTokens(proof2, { value: MAX_CONTRIBUTION });
            await crowdsale.connect(buyer3).buyTokens(proof3, { value: MAX_CONTRIBUTION });

            expect(await crowdsale.totalRaised()).to.equal(MAX_CONTRIBUTION.mul(3));
        });

        it("Should handle buyer purchasing in multiple transactions", async function () {
            await crowdsale.startSale();
            const proof = getProof(tree, buyer1.address);

            await crowdsale.connect(buyer1).buyTokens(proof, { value: MIN_CONTRIBUTION });
            await crowdsale.connect(buyer1).buyTokens(proof, { value: MIN_CONTRIBUTION });

            expect(await crowdsale.contributions(buyer1.address)).to.equal(
                MIN_CONTRIBUTION.mul(2)
            );
        });

        it("Should correctly track total tokens sold across multiple buyers", async function () {
            await crowdsale.startSale();
            const proof1 = getProof(tree, buyer1.address);
            const proof2 = getProof(tree, buyer2.address);

            await crowdsale.connect(buyer1).buyTokens(proof1, { value: MIN_CONTRIBUTION });
            await crowdsale.connect(buyer2).buyTokens(proof2, { value: MIN_CONTRIBUTION });

            const expectedTokens = MIN_CONTRIBUTION.mul(RATE).mul(2);
            expect(await crowdsale.totalTokensSold()).to.equal(expectedTokens);
        });

        it("Should not allow buying after finalization", async function () {
            await crowdsale.startSale();

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await crowdsale.finalizeSale();

            const proof = getProof(tree, buyer1.address);
            await expect(
                crowdsale.connect(buyer1).buyTokens(proof, { value: MIN_CONTRIBUTION })
            ).to.be.revertedWith("Sale has been finalized");
        });

        it("Should allow claim and refund for different buyers in same sale", async function () {
            // Deploy fresh crowdsale
            const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
            const newCrowdsale = await Crowdsale.deploy(
                token.address,
                RATE, HARD_CAP, SOFT_CAP, MIN_CONTRIBUTION,
                MAX_CONTRIBUTION, SALE_DURATION, VESTING_DURATION,
                CLIFF_DURATION, merkleRoot, owner.address
            );
            await newCrowdsale.deployed();
            const tokensNeeded = HARD_CAP.mul(RATE);
            await token.transfer(newCrowdsale.address, tokensNeeded);
            await newCrowdsale.startSale();

            // Only buyer1 buys — soft cap not reached
            const proof = getProof(tree, buyer1.address);
            await newCrowdsale.connect(buyer1).buyTokens(proof, { value: MIN_CONTRIBUTION });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await newCrowdsale.finalizeSale();

            // buyer1 should get refund
            await newCrowdsale.connect(buyer1).claimRefund();
            expect(await newCrowdsale.refundClaimed(buyer1.address)).to.be.true;
        });

        it("Should correctly calculate vested amount at exactly full vest", async function () {
            await crowdsale.startSale();

            const proof1 = getProof(tree, buyer1.address);
            const proof2 = getProof(tree, buyer2.address);
            const proof3 = getProof(tree, buyer3.address);

            await crowdsale.connect(buyer1).buyTokens(proof1, { value: MAX_CONTRIBUTION });
            await crowdsale.connect(buyer2).buyTokens(proof2, { value: MAX_CONTRIBUTION });
            await crowdsale.connect(buyer3).buyTokens(proof3, { value: MAX_CONTRIBUTION });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await crowdsale.finalizeSale();

            await ethers.provider.send("evm_increaseTime", [VESTING_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            const purchased = await crowdsale.tokensPurchased(buyer1.address);
            expect(await crowdsale.getVestedAmount(buyer1.address)).to.equal(purchased);
        });

        it("Should revert when using wrong proof for whitelisted address", async function () {
            await crowdsale.startSale();
            // buyer1 tries to use buyer2's proof
            const wrongProof = getProof(tree, buyer2.address);
            await expect(
                crowdsale.connect(buyer1).buyTokens(wrongProof, { value: MIN_CONTRIBUTION })
            ).to.be.revertedWith("Not whitelisted");
        });

        it("Should revert with empty proof for whitelisted address", async function () {
            await crowdsale.startSale();
            await expect(
                crowdsale.connect(buyer1).buyTokens([], { value: MIN_CONTRIBUTION })
            ).to.be.revertedWith("Not whitelisted");
        });

        it("Should allow purchase at exact minimum contribution", async function () {
            await crowdsale.startSale();
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, { value: MIN_CONTRIBUTION });
            expect(await crowdsale.contributions(buyer1.address)).to.equal(MIN_CONTRIBUTION);
        });

        it("Should allow purchase at exact maximum contribution", async function () {
            await crowdsale.startSale();
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, { value: MAX_CONTRIBUTION });
            expect(await crowdsale.contributions(buyer1.address)).to.equal(MAX_CONTRIBUTION);
        });

        it("Should return zero refund amount after refund claimed", async function () {
            await crowdsale.startSale();
            const proof = getProof(tree, buyer1.address);
            await crowdsale.connect(buyer1).buyTokens(proof, { value: MIN_CONTRIBUTION });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await crowdsale.finalizeSale();
            await crowdsale.connect(buyer1).claimRefund();

            expect(await crowdsale.getRefundAmount(buyer1.address)).to.equal(0);
        });

        it("Should decrease token balance after claim", async function () {
            await crowdsale.startSale();

            const proof1 = getProof(tree, buyer1.address);
            const proof2 = getProof(tree, buyer2.address);
            const proof3 = getProof(tree, buyer3.address);

            await crowdsale.connect(buyer1).buyTokens(proof1, { value: MAX_CONTRIBUTION });
            await crowdsale.connect(buyer2).buyTokens(proof2, { value: MAX_CONTRIBUTION });
            await crowdsale.connect(buyer3).buyTokens(proof3, { value: MAX_CONTRIBUTION });

            await ethers.provider.send("evm_increaseTime", [SALE_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await crowdsale.finalizeSale();

            const balanceBefore = await crowdsale.tokenBalance();

            await ethers.provider.send("evm_increaseTime", [VESTING_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await crowdsale.connect(buyer1).claimTokens();

            const balanceAfter = await crowdsale.tokenBalance();
            expect(balanceAfter).to.be.lt(balanceBefore);
        });

        it("Should prevent admin from renouncing DEFAULT_ADMIN_ROLE", async function () {
            const DEFAULT_ADMIN_ROLE = await crowdsale.DEFAULT_ADMIN_ROLE();
            await expect(
                crowdsale.renounceRole(DEFAULT_ADMIN_ROLE, owner.address)
            ).to.be.reverted;
        });

    });
});