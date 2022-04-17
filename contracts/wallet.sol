pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

// To use bytes32 on truffle is necessary to convertit from string using web3.utils.fromUtf8

contract Wallet is Ownable{
  using SafeMath for uint256;

  struct Token {
    bytes32 ticker;
    address tokenAddress;
  }
  mapping(bytes32 => Token) public tokenMapping;
  bytes32[] public tokenList;

  mapping(address => mapping(bytes32=> uint256)) public balances;

  //mapping(address => uint256) public ethBalances;

  modifier tokenExist(bytes32 ticker) {
    require(tokenMapping[ticker].tokenAddress != address(0), "Token uknown");
    _;
  }

  function addToken(bytes32 ticker, address tokenAddress) external onlyOwner {
    // check if address implements a erc20?
    tokenMapping[ticker] = Token(ticker, tokenAddress);
    tokenList.push(ticker);
  }

  // checks, effects, interactions
  function deposit(uint256 amount, bytes32 ticker) external tokenExist(ticker) {
    //TODO safe math
    //TODO approve token? before. I think the approve token must be called outside by the user
    //TODO transfer at the token contract the amount from the address of the user to the haddress of this wallet

    //balances[msg.sender][ticker] = balances[msg.sender][ticker].add(amount);
    //bool success = IERC20(tokenMapping[ticker].tokenAddress).transferFrom(msg.sender, address(this), amount);
    //if (!success) {
    //  balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(amount);
    //}

    // o instrutor implementa essa versao
    IERC20(tokenMapping[ticker].tokenAddress).transferFrom(msg.sender, address(this), amount);
    balances[msg.sender][ticker] = balances[msg.sender][ticker].add(amount);

    // what happens when the the transaction run out of gas, everything gets reverted?
    
  }

  function depositEth() external payable {
    balances[msg.sender]["ETH"]  = balances[msg.sender]["ETH"].add(msg.value);
  }

  // checks, effects interactions
  function withdraw(uint256 amount, bytes32 ticker) external tokenExist(ticker) {
    //TODO: can i check if a contract implements a interface?
    require(balances[msg.sender][ticker] >= amount, "Not enough balance");
    balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(amount);
    IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount);
  }
}
