export const vulnerableSampleContract = `pragma solidity ^0.8.0;

contract VulnerableVault {
    address public owner;
    mapping(address => uint) public balances;

    constructor() {
        owner = msg.sender;
    }

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() public {
        payable(msg.sender).transfer(balances[msg.sender]);
    }

    function kill() public {
        selfdestruct(payable(owner));
    }
}
`;

export const saferSampleContract = `pragma solidity ^0.8.0;

contract SaferVault {
    address public owner;
    bool public paused;
    mapping(address => uint256) public balances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Paused(bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "No value sent");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external whenNotPaused {
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
    }

    function migrationNote() external pure returns (string memory) {
        return "Future migration and key rotation supported by admin process.";
    }
}
`;