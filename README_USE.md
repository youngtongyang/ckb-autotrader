## 使用说明

1. 安装依赖

```bash
pnpm install
```

2. 增加配置

2.1 在config/config.yaml中增加本地配置，如有env的环境变量，则以环境变量的值为准。
```
production/development/local

utxo/search_key 为空时，表示获取所有池子，否则是取指定池子
```

2.2 在parameters/walletRegistry.ts中增加钱包配置. 
```
swap情况下，只需要配置 defaultWallet即可
```

2.3 根据实际情况修改parameters/walletConfigRegistry.ts中对应钱包的 balanceConfig 配置
