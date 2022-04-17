const Dex = artifacts.require("Dex");
const TestToken = artifacts.require("TestToken");
const truffleAssert = require('truffle-assertions');

contract("Dex", accounts => {

  it("Should only be possible for the owner to add tokens", async () => {
    let dex = await Dex.deployed();
    let test_token = await TestToken.deployed();
    let test_token_ticker = await web3.utils.fromUtf8("TST");
    await truffleAssert.passes(
      dex.addToken(test_token_ticker, test_token.address, {from: accounts[0]})
    );
    await truffleAssert.reverts(
      dex.addToken(test_token_ticker, test_token.address, {from: accounts[1]})
    );
    //await test_token.approve(wallet.address, 500);
    //await wallet.deposit(500, test_token_ticker);
    //let balanceOfTest = await wallet.balances(accounts[0], test_token_ticker);
    //console.log("balanceOfTest", balanceOfTest);
  })

  it("Deposit Test", async () => {
    let dex = await Dex.deployed();
    let test_token = await TestToken.deployed();
    let test_token_ticker = await web3.utils.fromUtf8("TST");
    
    await test_token.approve(dex.address, 500);
    await dex.deposit(500, test_token_ticker);
    let balanceOfTest = await dex.balances(accounts[0], test_token_ticker);
    assert.equal(balanceOfTest.toNumber(), 500);
  })

  it("The user must have ETH deposited such that deposited eth >= buy order value", async () => {
    let dex = await Dex.deployed();
    let test_token = await TestToken.deployed();
    let test_token_ticker = await web3.utils.fromUtf8("TST");
    let eth_ticker = await web3.utils.fromUtf8("ETH");

    await truffleAssert.reverts(
      dex.createLimitOrder(0, test_token_ticker, 50, 1)
    );

    await dex.depositEth({from: accounts[0], value: 100});
    
    await truffleAssert.passes(
      dex.createLimitOrder(0, test_token_ticker, 50, 2)
    );
  })

  it("The user must have enought tokens deposited such that token balance >= sell order value", async () => {
    let dex = await Dex.deployed();
    let test_token = await TestToken.deployed();
    let test_token_ticker = await web3.utils.fromUtf8("TST");

    // try creating invalid order
    await truffleAssert.reverts(
      dex.createLimitOrder(1, test_token_ticker, 50, 2, {from: accounts[1]})
    );
    // transfer from account0 to account 1, 50 TST
    await test_token.transfer(accounts[1], 50, {from: accounts[0]});
    // accounts[1] deposits TST
    await test_token.approve(dex.address, 50, {from: accounts[1]});
    await dex.deposit(50, test_token_ticker, {from: accounts[1]});
    // create limit oeder
    await truffleAssert.passes(
      dex.createLimitOrder(1, test_token_ticker, 50, 2, {from: accounts[1]})
    );
    
  })

  it("The BUY orderbook should be ordered from highest to lowest", async () => {
    let dex = await Dex.deployed();
    let test_token = await TestToken.deployed();
    let test_token_ticker = await web3.utils.fromUtf8("TST");

    await dex.depositEth({from: accounts[0], value: 500});

    dex.createLimitOrder(0, test_token_ticker, 50, 1);
    dex.createLimitOrder(0, test_token_ticker, 50, 3);
    dex.createLimitOrder(0, test_token_ticker, 50, 7);
    dex.createLimitOrder(0, test_token_ticker, 50, 5);
    dex.createLimitOrder(0, test_token_ticker, 50, 3);

    let buyOrders = await dex.getOrderBook(test_token_ticker, 0);
    assert(buyOrders.length > 0);
    //console.log(buyOrders);
    for (i = 0; i < buyOrders.length - 1; ++i) {
      assert(buyOrders[i].price >= buyOrders[i+1].price);
    }
    
  })

  it("The SELL orderbook should be ordered from lowest to highest", async () => {
    let dex = await Dex.deployed();
    let test_token = await TestToken.deployed();
    let test_token_ticker = await web3.utils.fromUtf8("TST");

    // transfer from account0 to account 1, 50 TST
    await test_token.transfer(accounts[1], 50, {from: accounts[0]});
    // accounts[1] deposits TST
    await test_token.approve(dex.address, 50, {from: accounts[1]});
    await dex.deposit(50, test_token_ticker, {from: accounts[1]});

    dex.createLimitOrder(1, test_token_ticker, 50, 1, {from: accounts[1]});
    dex.createLimitOrder(1, test_token_ticker, 50, 3, {from: accounts[1]});
    dex.createLimitOrder(1, test_token_ticker, 50, 7, {from: accounts[1]});
    dex.createLimitOrder(1, test_token_ticker, 50, 5, {from: accounts[1]});
    dex.createLimitOrder(1, test_token_ticker, 50, 3, {from: accounts[1]});

    let sellOrders = await dex.getOrderBook(test_token_ticker, 1);
    assert(sellOrders.length > 0);
    //console.log(sellOrders);
    for (i = 0; i < sellOrders.length - 1; ++i) {
      assert(sellOrders[i].price <= sellOrders[i+1].price);
    }
    
  })
})

contract("Dex", accounts => {
  it("Market order tests setup", async () => {
    let dex = await Dex.deployed();
    let test_token = await TestToken.deployed();
    let test_token_ticker = await web3.utils.fromUtf8("TST");
    await truffleAssert.passes(
      dex.addToken(test_token_ticker, test_token.address, {from: accounts[0]})
    );
    
    //console.log("Balance account 0", await test_token.balanceOf(accounts[0]));

    let token_deposit = 100
    test_token.transfer(accounts[1], token_deposit);
    test_token.transfer(accounts[2], token_deposit);
    test_token.transfer(accounts[3], token_deposit);
    test_token.transfer(accounts[4], token_deposit);
    test_token.transfer(accounts[5], token_deposit);

    for (i = 1; i<6; ++i) {
      // accounts[1] deposits TST
      await test_token.approve(dex.address, token_deposit, {from: accounts[i]});
      await dex.deposit(token_deposit, test_token_ticker, {from: accounts[i]});
    }

    //console.log("Accounts length", accounts.length);

    for (i = 6; i < accounts.length; ++i) {
      await dex.depositEth({from: accounts[i], value: 100});
    }

  })

  it("When creating a sell market order, the seller needs to have enough token for the trade", async () => {
    
    let dex = await Dex.deployed();
    let test_token = await TestToken.deployed();
    let test_token_ticker = await web3.utils.fromUtf8("TST");
    let sell = 1;

    await truffleAssert.reverts(
      dex.createMarketOrder(sell, test_token_ticker, 50, {from: accounts[0]})
    )

    let token_deposit = 500
    await test_token.approve(dex.address, token_deposit);
    await dex.deposit(token_deposit, test_token_ticker);
    
    await truffleAssert.passes(
      dex.createMarketOrder(sell, test_token_ticker, 50, {from: accounts[0]})
    )
  })
  
  it("When creating a BUY market order, the buyer needs eth for the trade", async () => {
    
    let dex = await Dex.deployed();
    let test_token = await TestToken.deployed();
    let test_token_ticker = await web3.utils.fromUtf8("TST");

    let buy = 0;
    await truffleAssert.reverts(
      dex.createMarketOrder(buy, test_token_ticker, 50)
    )

    await dex.depositEth({from: accounts[0], value: 100});

    await truffleAssert.passes(
      dex.createMarketOrder(buy, test_token_ticker, 50)
    )
  })

  it("Fill buy market order", async () => {
    let dex = await Dex.deployed();
    let test_token = await TestToken.deployed();
    let test_token_ticker = await web3.utils.fromUtf8("TST");

    // create orders
    let buy = 0;
    let sell = 1;

    let sellAmount = 10;
    await dex.createLimitOrder(sell, test_token_ticker, sellAmount, 1, {from: accounts[1]})
    await dex.createLimitOrder(sell, test_token_ticker, sellAmount, 2, {from: accounts[2]})
    await dex.createLimitOrder(sell, test_token_ticker, sellAmount, 3, {from: accounts[3]})
    await dex.createLimitOrder(sell, test_token_ticker, sellAmount, 4, {from: accounts[4]})

    let beforeBuyerBalance = await dex.balances(accounts[0], test_token_ticker);
    let beforeSeller1Balance = await dex.balances(accounts[1], test_token_ticker);
    //console.log(beforeSeller1Balance);

    let buyAmount = 25;
    await dex.createMarketOrder(buy, test_token_ticker, buyAmount);

    let sellOrders = await dex.getOrderBook(test_token_ticker, sell);

    assert.equal(sellOrders.length, 2);

    let afterBuyerBalance = await dex.balances(accounts[0], test_token_ticker);
    assert(afterBuyerBalance.eq(beforeBuyerBalance.add(web3.utils.toBN(buyAmount))));
    
    let afterSeller1Balance = await dex.balances(accounts[1], test_token_ticker);
    assert(afterSeller1Balance.eq( beforeSeller1Balance.sub( web3.utils.toBN(sellAmount) ) ) );
    
  })

  it("Fill sell market order", async () => {
    let dex = await Dex.deployed();
    let test_token = await TestToken.deployed();
    let test_token_ticker = await web3.utils.fromUtf8("TST");

    // create orders
    let buy = 0;
    let sell = 1;

    let beforeSellerBalance = await dex.balances(accounts[0], test_token_ticker);
    let beforeBuyer1Balance = await dex.balances(accounts[9], test_token_ticker);

    let buyAmount = 10;
    await dex.createLimitOrder(buy, test_token_ticker, buyAmount, 1, {from: accounts[6]})
    await dex.createLimitOrder(buy, test_token_ticker, buyAmount, 2, {from: accounts[7]})
    await dex.createLimitOrder(buy, test_token_ticker, buyAmount, 3, {from: accounts[8]})
    await dex.createLimitOrder(buy, test_token_ticker, buyAmount, 4, {from: accounts[9]})    

    let sellAmount = 25;
    await dex.createMarketOrder(sell, test_token_ticker, sellAmount);

    let buyOrders = await dex.getOrderBook(test_token_ticker, buy);
    //console.log(buyOrders);
    
    assert.equal(2, buyOrders.length);
    
    let afterSellerBalance = await dex.balances(accounts[0], test_token_ticker);
    assert(afterSellerBalance.eq(beforeSellerBalance.sub(web3.utils.toBN(sellAmount))));
    
    let afterBuyer1Balance = await dex.balances(accounts[9], test_token_ticker);
    assert(afterBuyer1Balance.eq( beforeBuyer1Balance.add( web3.utils.toBN(buyAmount) ) ) );
  })
})
