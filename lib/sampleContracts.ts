export const vulnerableSampleContract = `pragma solidity ^0.8.0;

contract VulnerableVault {
    address public owner;
    address public bridgeSigner;
    address public implementation;

    mapping(address => uint256) public balances;
    address[] public users;

    constructor(address _bridgeSigner, address _implementation) {
        owner = msg.sender;
        bridgeSigner = _bridgeSigner;
        implementation = _implementation;
    }

    function deposit() public payable {
        balances[msg.sender] += msg.value;
        users.push(msg.sender);
    }

    function withdraw(bytes memory signature) public {
        bytes32 digest = keccak256(
            abi.encodePacked(msg.sender, balances[msg.sender], block.timestamp)
        );

        address recovered = ecrecover(digest, 27, bytes32(0), bytes32(0));
        require(recovered == bridgeSigner, "Invalid signer");

        (bool sent, ) = payable(msg.sender).call{value: balances[msg.sender]}("");
        balances[msg.sender] = 0;
    }

    function updateBridgeSigner(address newSigner) public {
        bridgeSigner = newSigner;
    }

    function emergencyBridgeRelease(address payable to, uint256 amount) public {
        require(tx.origin == owner, "Only owner");
        to.transfer(amount);
    }

    function emergencyDelegate(bytes calldata data) public {
        implementation.delegatecall(data);
    }

    function batchRewardUsers(uint256 amount) public {
        for (uint256 i = 0; i < users.length; i++) {
            balances[users[i]] += amount;
        }
    }

    function pickLuckyUser() public view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % users.length;
    }

    function dangerousMath(uint256 x) public pure returns (uint256) {
        unchecked {
            return x + 1;
        }
    }

    function kill() public {
        selfdestruct(payable(owner));
    }
}
`;

export const saferSampleContract = `pragma solidity ^0.8.0;

contract SaferTreasuryModule {
    address public owner;
    address public bridgeSigner;
    bool public paused;
    bool private locked;

    mapping(address => uint256) public balances;
    address[] public users;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Paused(bool status);
    event AdminRotated(address indexed newOwner);
    event BridgeSignerUpdated(address indexed newSigner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    constructor(address initialBridgeSigner) {
        require(initialBridgeSigner != address(0), "Zero signer");
        owner = msg.sender;
        bridgeSigner = initialBridgeSigner;
    }

    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "No value sent");

        if (balances[msg.sender] == 0) {
            users.push(msg.sender);
        }

        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Invalid amount");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);

        emit Withdrawn(msg.sender, amount);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    function rotateAdmin(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
        emit AdminRotated(newOwner);
    }

    function updateBridgeSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Zero signer");
        bridgeSigner = newSigner;
        emit BridgeSignerUpdated(newSigner);
    }

    function migrationNote() external pure returns (string memory) {
        return "Future migration and key rotation supported by admin process.";
    }
}
`;