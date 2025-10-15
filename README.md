# NFT 拍卖系统

## 项目简介

这是一个基于 Solidity 和 Hardhat 的 NFT 拍卖智能合约系统，支持多种 ERC20 代币和 ETH 参与竞拍，并通过 Chainlink 预言机实现统一的价格度量。系统采用工厂模式和透明代理（Transparent Proxy）可升级模式，确保合约的灵活性和可维护性。

## 核心功能

### 1. NFT 拍卖核心功能
- **创建拍卖**：卖家可以创建拍卖，设置起始价格和持续时间
- **多币种竞拍**：支持 ETH 和多种 ERC20 代币参与竞拍
- **价格统一**：通过 Chainlink 预言机将不同代币价格转换为统一的 USD 标准
- **自动退款**：当有更高出价时，自动退回之前最高出价者的资金
- **结束拍卖**：拍卖结束后，NFT 转移给最高出价者，资金转移给卖家

### 2. 工厂模式
- **批量部署**：通过工厂合约批量创建拍卖合约实例
- **统一管理**：工厂合约统一管理所有拍卖合约地址
- **NFT 托管**：工厂合约负责接收和转移 NFT

### 3. 可升级性
- **透明代理模式**：采用 OpenZeppelin 透明代理（Transparent Proxy）模式
- **逻辑分离**：合约逻辑和数据存储分离
- **平滑升级**：支持合约逻辑升级而不影响现有数据
- **ProxyAdmin 管理**：通过 ProxyAdmin 合约统一管理升级权限

## 项目结构

```
Auction/
├── contracts/
│   ├── NftAuction.sol          # 核心拍卖合约（可升级）
│   ├── NftAuctionV2.sol        # 拍卖合约升级版本示例
│   ├── NftAuctionFactory.sol   # 工厂合约
│   └── test/
│       ├── TestERC721.sol      # 测试用 NFT 合约
│       ├── TestERC20.sol       # 测试用 ERC20 代币
│       └── AggregatorV3Interface.sol  # 自定义预言机（测试用）
├── test/
│   ├── TestAuction.js          # 拍卖功能测试
│   ├── TestFactory.js          # 工厂模式测试
│   └── upgrade.js              # 合约升级测试
├── hardhat.config.js           # Hardhat 配置
└── package.json                # 项目依赖
```

## 技术架构

### 智能合约架构

#### NftAuction.sol
可升级的核心拍卖合约，采用透明代理模式：
- **初始化函数**：`initialize()` 替代构造函数
- **拍卖管理**：创建、出价、结束拍卖
- **价格预言机**：集成 Chainlink 预言机获取实时价格
- **权限控制**：只有管理员可以创建拍卖
- **可升级支持**：继承 `UUPSUpgradeable` 提供升级接口

**核心数据结构**：
```solidity
struct Auction {
    address seller;           // 卖家地址
    uint256 duration;        // 拍卖持续时间
    uint256 startTime;       // 开始时间
    uint256 startPrice;      // 起始价格
    bool ended;              // 是否结束
    address highestBidder;   // 最高出价者
    uint256 highestBid;      // 最高出价
    address nftContract;     // NFT 合约地址
    address tokenAddress;    // 参与竞价的代币地址
    uint256 tokenId;         // NFT Token ID
}
```

#### NftAuctionFactory.sol
工厂合约，用于批量创建和管理拍卖合约：
- **创建拍卖**：部署新的拍卖合约实例
- **NFT 托管**：接收用户的 NFT 并授权给拍卖合约
- **地址管理**：记录所有已创建的拍卖合约地址

**工作流程**：
1. 用户授权 NFT 给工厂合约
2. 工厂接收 NFT
3. 工厂创建新的拍卖合约实例
4. 工厂授权拍卖合约操作 NFT
5. 拍卖合约从工厂转移 NFT 到自己

#### NftAuctionV2.sol
演示合约升级的示例版本，添加了新功能：
- 继承自 NftAuction
- 添加 `testHello()` 函数演示功能扩展
- 通过透明代理升级机制实现无缝升级

### 依赖技术栈

- **Solidity 0.8.28**：智能合约开发语言
- **Hardhat**：以太坊开发框架
- **OpenZeppelin Contracts**：安全的智能合约库
  - ERC721/ERC20 标准实现
  - 可升级合约工具
- **Chainlink**：去中心化预言机
- **Ethers.js v6**：以太坊 JavaScript 库
- **Chai**：测试断言库

## 安装与配置

### 环境要求
- Node.js >= 16.x
- npm 或 pnpm

### 安装依赖

```bash
npm install
# 或
pnpm install
```

### 项目依赖

核心依赖：
```json
{
  "dependencies": {
    "@chainlink/contracts": "^1.5.0",
    "@openzeppelin/contracts": "^5.4.0",
    "@openzeppelin/contracts-upgradeable": "^5.4.0",
    "@openzeppelin/hardhat-upgrades": "^3.9.1"
  },
  "devDependencies": {
    "hardhat": "^2.26.3",
    "ethers": "^6.15.0",
    "@nomicfoundation/hardhat-toolbox": "^6.1.0",
    "solidity-coverage": "^0.8.16"
  }
}
```

## 使用指南

### 本地测试

#### 1. 编译合约
```bash
npx hardhat compile
```

#### 2. 运行测试
```bash
# 运行所有测试
npx hardhat test

# 运行特定测试文件
npx hardhat test test/TestAuction.js
npx hardhat test test/TestFactory.js
npx hardhat test test/upgrade.js
```

#### 3. 测试覆盖率
```bash
npx hardhat coverage
```

#### 4. Gas 报告
在 `hardhat.config.js` 中启用 gas reporter，然后运行测试：
```bash
npx hardhat test
```

### 部署流程

#### 1. 配置网络

编辑 `hardhat.config.js`，添加测试网配置：

```javascript
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // 其他网络配置...
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
```

#### 2. 设置环境变量

创建 `.env` 文件：
```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

#### 3. 部署脚本

创建部署脚本 `scripts/deploy.js`：

```javascript
const { ethers, upgrades } = require("hardhat");

async function main() {
  // 1. 部署工厂合约
  const NftAuctionFactory = await ethers.getContractFactory("NftAuctionFactory");
  const factory = await NftAuctionFactory.deploy();
  await factory.waitForDeployment();
  console.log("Factory deployed to:", await factory.getAddress());

  // 2. 部署预言机（生产环境使用 Chainlink 官方预言机）
  const AggregatorV3 = await ethers.getContractFactory("AggreagatorV3");
  const ethPriceFeed = await AggregatorV3.deploy(ethers.parseEther("3000")); // ETH = $3000
  await ethPriceFeed.waitForDeployment();
  console.log("ETH Price Feed deployed to:", await ethPriceFeed.getAddress());

  // 3. 部署测试 NFT（可选）
  const TestERC721 = await ethers.getContractFactory("TestERC721");
  const nft = await TestERC721.deploy();
  await nft.waitForDeployment();
  console.log("Test NFT deployed to:", await nft.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### 4. 执行部署
```bash
# 部署到 Sepolia 测试网
npx hardhat run scripts/deploy.js --network sepolia

# 部署到本地网络
npx hardhat run scripts/deploy.js --network localhost
```

#### 5. 验证合约
```bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

## 使用示例

### 创建拍卖（通过工厂）

```javascript
const { ethers } = require("hardhat");

async function createAuction() {
  const [signer] = await ethers.getSigners();

  // 获取合约实例
  const factory = await ethers.getContractAt("NftAuctionFactory", FACTORY_ADDRESS);
  const nft = await ethers.getContractAt("TestERC721", NFT_ADDRESS);

  // 1. 授权 NFT 给工厂
  await nft.setApprovalForAll(await factory.getAddress(), true);

  // 2. 创建拍卖
  const tx = await factory.createAuction(
    3600,                          // 持续时间 1 小时
    ethers.parseEther("0.1"),     // 起始价格 0.1 ETH
    NFT_ADDRESS,                   // NFT 合约地址
    1                              // Token ID
  );

  const receipt = await tx.wait();
  const auctionAddress = receipt.logs.find(
    log => log.eventName === 'AuctionCreated'
  )?.args[0];

  console.log("Auction created at:", auctionAddress);
}
```

### 参与竞拍

```javascript
async function placeBid() {
  const [_, buyer] = await ethers.getSigners();
  const auction = await ethers.getContractAt("NftAuction", AUCTION_ADDRESS);

  // 使用 ETH 竞拍
  await auction.connect(buyer).placeBid(
    0,                        // 拍卖 ID
    0,                        // amount（ETH 时为 0）
    ethers.ZeroAddress,      // ETH 地址
    { value: ethers.parseEther("0.2") }
  );

  // 使用 ERC20 竞拍
  const token = await ethers.getContractAt("TestERC20", TOKEN_ADDRESS);
  await token.connect(buyer).approve(AUCTION_ADDRESS, ethers.MaxUint256);
  await auction.connect(buyer).placeBid(
    0,                              // 拍卖 ID
    ethers.parseEther("100"),      // 100 USDC
    TOKEN_ADDRESS                   // 代币地址
  );
}
```

### 结束拍卖

```javascript
async function endAuction() {
  const auction = await ethers.getContractAt("NftAuction", AUCTION_ADDRESS);

  // 等待拍卖时间结束
  await ethers.provider.send("evm_increaseTime", [3600]);
  await ethers.provider.send("evm_mine");

  // 结束拍卖
  await auction.endAuction(0);
  console.log("Auction ended");
}
```

### 升级合约

```javascript
const { ethers, upgrades } = require("hardhat");

async function upgradeAuction() {
  // 透明代理升级方式
  const NftAuctionV2 = await ethers.getContractFactory("NftAuctionV2");
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, NftAuctionV2);
  await upgraded.waitForDeployment();
  console.log("Auction upgraded to V2");

  // 测试新功能
  const result = await upgraded.testHello();
  console.log(result); // "test hello"

  // 验证代理地址不变，只有实现合约地址改变
  console.log("Proxy address:", await upgraded.getAddress());
}
```

## 测试说明

### 测试文件说明

#### TestAuction.js
测试核心拍卖功能：
- 合约部署
- 创建拍卖
- ETH 竞拍
- ERC20 竞拍
- 价格比较（通过预言机）
- 结束拍卖
- NFT 所有权转移

#### TestFactory.js
测试工厂模式：
- 工厂合约部署
- 通过工厂创建拍卖
- NFT 授权和转移流程
- 多实例管理

#### upgrade.js
测试合约升级：
- 透明代理部署
- 合约逻辑升级
- 数据持久性验证
- 新功能可用性
- 代理地址不变性验证

### 运行测试

```bash
# 运行所有测试并显示 Gas 消耗
npx hardhat test

# 运行特定测试
npx hardhat test test/TestFactory.js

# 生成覆盖率报告
npx hardhat coverage
```

### [测试报告](./TEST_REPORT.md)

## 安全考虑

### 已实现的安全措施

1. **重入攻击防护**：使用 checks-effects-interactions 模式
2. **权限控制**：只有管理员可以创建拍卖和升级合约
3. **参数验证**：所有外部输入都经过验证
4. **整数溢出**：使用 Solidity 0.8+ 内置溢出检查
5. **安全标准库**：使用 OpenZeppelin 的安全合约实现

### 注意事项

1. **价格预言机**：生产环境应使用 Chainlink 官方预言机地址
2. **私钥管理**：永远不要将私钥提交到代码仓库
3. **合约审计**：部署到主网前应进行专业的安全审计
4. **Gas 优化**：大规模使用前应优化 Gas 消耗
5. **紧急暂停**：考虑添加紧急暂停功能

## 常见问题

### Q: 如何修改拍卖持续时间？
A: 在调用 `createAuction` 时传入持续时间参数（单位：秒）。

### Q: 支持哪些代币竞拍？
A: 支持 ETH 和任何 ERC20 代币，需要先配置对应的价格预言机。

### Q: 如何添加新的价格预言机？
A: 调用 `setDataFeed(tokenAddress, priceFeedAddress)` 函数。

### Q: 合约升级会影响现有拍卖吗？
A: 不会，使用 UUPS 模式升级只更新逻辑，所有数据保持不变。

### Q: 如何取消拍卖？
A: 当前版本不支持取消拍卖，可以在升级版本中添加此功能。