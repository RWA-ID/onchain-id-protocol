// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/INameWrapper.sol";
import "./interfaces/AggregatorV3Interface.sol";

contract SubnameRegistrar is ERC721Enumerable, Ownable {
    bytes32 constant ETH_NODE =0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae;
    INameWrapper public immutable nameWrapper;
    AggregatorV3Interface public immutable oracle;

    string[] public parents = ["robot-id", "device-id", "drone-id", "machine-id", "vehicle-id"];
    mapping(uint256 => string) public licenseParent;
    uint256 public nextTokenId = 1;

    uint256 public licensePriceUSD = 100000 * 10**8; // $100K default in 8 decimals
    uint256[3] public tierPricesUSD = [450, 300, 150]; // cents per sub: $4.50, $3.00, $1.50

    address public payoutAddress;

    constructor(
        address _nameWrapper,
        address _oracle,
        address initialOwner,
        address _payoutAddress
    ) ERC721("IDLicense", "IDL") Ownable(initialOwner) {
        nameWrapper = INameWrapper(_nameWrapper);
        oracle = AggregatorV3Interface(_oracle);
        payoutAddress = _payoutAddress;
    }

    function buyLicense(string calldata parentLabel) external payable {
        bool validParent = false;
        for (uint i = 0; i < parents.length; i++) {
            if (keccak256(bytes(parents[i])) == keccak256(bytes(parentLabel))) {
                validParent = true;
                break;
            }
        }
        require(validParent, "Invalid parent");

        (, int256 ethPrice,,,) = oracle.latestRoundData();
        require(ethPrice > 0, "Invalid oracle price");
        uint256 uEthPrice = uint256(ethPrice);
        uint256 requiredETH = (licensePriceUSD * 1e18) / uEthPrice;

        require(msg.value >= requiredETH, "Insufficient ETH");
        uint256 tokenId = nextTokenId++;
        licenseParent[tokenId] = parentLabel;
        _safeMint(msg.sender, tokenId);
        emit LicenseBought(msg.sender, tokenId, parentLabel);

        if (msg.value > requiredETH) {
            payable(msg.sender).transfer(msg.value - requiredETH);
        }
    }

    function setLicensePriceUSD(uint256 newPrice) external onlyOwner {
        licensePriceUSD = newPrice;
    }

    function setTierPricesUSD(uint256[3] calldata newPrices) external onlyOwner {
        tierPricesUSD = newPrices;
    }

    function setPayoutAddress(address newPayout) external onlyOwner {
        payoutAddress = newPayout;
    }

    function withdraw() external onlyOwner {
        payable(payoutAddress).transfer(address(this).balance);
    }

    function _hasLicense(address user, string memory parentLabel) internal view returns (bool) {
        uint256 balance = balanceOf(user);
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            if (keccak256(bytes(licenseParent[tokenId])) == keccak256(bytes(parentLabel))) {
                return true;
            }
        }
        return false;
    }
function hasLicense(address user, string calldata parentLabel) external view returns (bool) {
    return _hasLicense(user, parentLabel);
}

function tierForQuantity(uint256 quantity) public view returns (uint256 feePerSubCents) {
    if (quantity <= 10) return tierPricesUSD[0];
    if (quantity <= 50) return tierPricesUSD[1];
    return tierPricesUSD[2];
}

// returns required payment in wei for NON-license users
function quoteBulk(uint256 quantity) external view returns (uint256 requiredWei, uint256 feePerSubCents, uint256 ethPrice8) {
    require(quantity > 0, "quantity=0");
    (, int256 ethPrice,,,) = oracle.latestRoundData();
    require(ethPrice > 0, "Invalid oracle price");

    ethPrice8 = uint256(ethPrice);
    feePerSubCents = tierForQuantity(quantity);

    // same math you’re already using:
    requiredWei = (feePerSubCents * quantity * 1e24) / ethPrice8;
}
    function registerBulk(string calldata parentLabel, string[] calldata labels, address to, address resolver, uint64 ttl) external payable {
        bool validParent = false;
        for (uint i = 0; i < parents.length; i++) {
            if (keccak256(bytes(parents[i])) == keccak256(bytes(parentLabel))) {
                validParent = true;
                break;
            }
        }
        require(validParent, "Invalid parent");
        require(labels.length > 0, "No labels");

        uint256 feePerSub = 0;
        if (!_hasLicense(msg.sender, parentLabel)) {
            (, int256 ethPrice,,,) = oracle.latestRoundData();
            require(ethPrice > 0, "Invalid oracle price");
            uint256 uEthPrice = uint256(ethPrice);

            uint256 quantity = labels.length;
            if (quantity <= 10) {
                feePerSub = tierPricesUSD[0];
            } else if (quantity <= 50) {
                feePerSub = tierPricesUSD[1];
            } else {
                feePerSub = tierPricesUSD[2];
            }
            uint256 requiredETH = (feePerSub * quantity * 1e24) / uEthPrice;
            require(msg.value >= requiredETH, "Insufficient ETH");

            if (msg.value > requiredETH) {
                payable(msg.sender).transfer(msg.value - requiredETH);
            }
        }

        bytes32 parentNode = keccak256(abi.encodePacked(ETH_NODE, keccak256(bytes(parentLabel))));

        for (uint i = 0; i < labels.length; i++) {
            nameWrapper.setSubnodeRecord(parentNode, labels[i], to, resolver, ttl, 0x00000001 | 0x00010000, type(uint64).max); // Burn PARENT_CANNOT_CONTROL and CANNOT_UNWRAP, max expiry
        }

        emit SubdomainsRegistered(msg.sender, parentLabel, labels.length);
    }

    // Events
    event LicenseBought(address indexed buyer, uint256 indexed tokenId, string parentLabel);
    event SubdomainsRegistered(address indexed registrant, string parentLabel, uint256 quantity);

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
