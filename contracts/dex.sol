pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./wallet.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

//contract MyDex is Wallet {
//
//  enum Side {
//    BUY,
//    SELL
//  }
//  
//  struct Order {
//    uint id;
//    address trader;
//    uint256 amount;
//    uint256 price;
//  }
//
//  mapping(bytes32 => mapping(uint => Order[])) public orderBook;
//
//  function getOrderBook(bytes32 ticker, Side side) tokenExist(ticker) view public returns(Order[] memory){
//    return orderBook[ticker][uint(side)];
//  }
//
//}
  
contract Dex is Wallet {
  using SafeMath for uint256;

  enum Side {
    BUY,
    SELL
  }
  
  struct Order {
    uint id;
    address trader;
    Side side;
    bytes32 ticker;
    uint256 amount;
    uint256 price;
  }

  uint256 curOrderID;

  mapping(bytes32 => mapping(uint => Order[])) public orderBook;

  event orderExecuted (uint indexed id);
  event orderPartialyExecuted (uint indexed id);
  
  event numberDebug (uint indexed id, uint indexed id2, uint indexed id3);

  function getOrderBook(bytes32 ticker, Side side) tokenExist(ticker) view public returns(Order[] memory){
    return orderBook[ticker][uint(side)];
  }

  function createLimitOrder(Side side, bytes32 ticker, uint256 amount, uint256 price) public {
    if (side == Side.BUY) {
      require(balances[msg.sender]["ETH"] >= price.mul(amount));
      // put it at the end and bring it to the right index using a bubble sort
      orderBook[ticker][uint(side)].push(Order(curOrderID, msg.sender, side, ticker, amount, price));
      _buyBubbleSort(ticker);
    }
    else {
      require(balances[msg.sender][ticker] >= amount);
      orderBook[ticker][uint(side)].push(Order(curOrderID, msg.sender, side, ticker, amount, price));
      _sellBubbleSort(ticker);
    }

    curOrderID++;
  }

  function createMarketOrder (Side side, bytes32 ticker, uint256 amount) public {
    if (side == Side.SELL) {
      require(balances[msg.sender][ticker] >= amount);
      Order[] storage orders = orderBook[ticker][uint(Side.BUY)];
      if (orders.length == 0)
        return;
      
      uint executedOrders = 0;
      for (uint i=0; i<orders.length; ++i) {
        if (amount == 0 || balances[msg.sender][ticker] == 0) {
          break;
        }
        Order storage order = orders[i];
        uint256 executeAmount = _min(amount, order.amount);
        if (executeAmount > 0) {
          // transfer eth
          uint256 ethTransfer = executeAmount.mul(order.price);
          transfer(order.trader, msg.sender, "ETH", ethTransfer);
          // transfer token
          transfer(msg.sender, order.trader, ticker, executeAmount);
          // update amount 
          order.amount = order.amount.sub(executeAmount);
          amount = amount.sub(executeAmount);
          // emit events
          if (order.amount > 0) {
            emit orderPartialyExecuted(order.id);
          }
          else {
            executedOrders++;
            emit orderExecuted(order.id);
          }
        }
      }

      // clear executed orders
      clearExecutedOrders(orders, executedOrders);
    }
    else if (side == Side.BUY) {
      require(balances[msg.sender]["ETH"] > 0);
      Order[] storage orders = orderBook[ticker][uint(Side.SELL)];
      if (orders.length == 0)
        return;

      uint executedOrders = 0;
      for (uint i=0; i<orders.length; ++i) {
        if (amount == 0 || balances[msg.sender]["ETH"] == 0) {
          break;
        }
        Order storage order = orders[i];
        uint256 executeAmount = _min(amount, order.amount);
        //emit numberDebug(executeAmount, amount, order.amount);
        // check sender eth balance against the executeAmount
        if (balances[msg.sender]["ETH"] < executeAmount.mul(order.price)) {
          // adjust the executeAmount to the user's eth balance
          executeAmount = balances[msg.sender]["ETH"].div(order.price);
        }
        if (executeAmount > 0) {
          // transfer eth
          uint256 ethTransfer = executeAmount.mul(order.price);
          transfer(msg.sender, order.trader, "ETH", ethTransfer);
          // transfer token
          transfer(order.trader, msg.sender, ticker, executeAmount);
          // update amount 
          order.amount = order.amount.sub(executeAmount);
          amount = amount.sub(executeAmount);

          // emit events
          if (order.amount > 0) {
            emit orderPartialyExecuted(order.id);
          }
          else {
            executedOrders++;
            emit orderExecuted(order.id);
          }
        }
      }
      
      // clear executed orders
      clearExecutedOrders(orders, executedOrders);
    }
      
  }

  function _buyBubbleSort (bytes32 ticker) private {
    Order[] storage orders = orderBook[ticker][uint(Side.BUY)];
    uint i = orders.length > 0 ? orders.length - 1 : 0;
    while (i > 0) {
      if (orders[i].price > orders[i-1].price) {
        Order memory temp = orders[i-1]; //memory or storage?
        orders[i-1] = orders[i];
        orders[i] = temp;
      }
      else
        break;
      i--;
    }
  }

  function _sellBubbleSort (bytes32 ticker) private {
    Order[] storage orders = orderBook[ticker][uint(Side.SELL)];
    uint i = orders.length > 0 ? orders.length - 1 : 0;
    while (i > 0) {
      if (orders[i].price < orders[i-1].price) {
        Order memory temp = orders[i-1];
        orders[i-1] = orders[i];
        orders[i] = temp;
      }
      else
        break;
      i--;
    }
  }

  function clearExecutedOrders (Order[] storage orders, uint executedOrders) private {
    // clear executed orders
    for (uint i = executedOrders; i<orders.length; ++i) {
      orders[i - executedOrders] = orders[i];
    }
    for (uint i = 0; i < executedOrders; ++i) {
      orders.pop();
    }
  }

  function transfer (address from, address to, bytes32 ticker, uint256 amount) private {
    balances[from][ticker] = balances[from][ticker].sub(amount);
    balances[to][ticker] = balances[to][ticker].add(amount);
  }

  function _max (uint256 a, uint256 b) private pure returns (uint) {
    return a > b ? a : b;
  }

  function _min (uint256 a, uint256 b) private pure returns (uint) {
    return a < b ? a : b;
  }
}
