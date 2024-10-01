import { WalletStatus } from "@app/schemas";
import { Wallet } from "@ckb-ccc/core";

export class Strategy {
  strategyName: string;
  wallets: Wallet[];
  constructor(strategyName: string, wallets: Wallet[]) {
    this.strategyName = strategyName;
    this.wallets = wallets;
  }
}

export class WalletConfig {
  balanceConfig?: BalanceConfig[];
  constructor(balanceConfig: BalanceConfig[]) {
    this.balanceConfig = balanceConfig;
  }
}

export class BalanceConfig {
  symbol: string;
  portionInStrategy?: number;
  portionInWallet?: number;
  constructor(
    symbol: string,
    portionInStrategy: number = 0,
    portionInWallet: number = 0,
  ) {
    this.symbol = symbol;
    this.portionInStrategy = portionInStrategy;
    this.portionInWallet = portionInWallet;
  }
}

export class CMMWallet implements Wallet {
  name: string;
  icon: string;
  address: string;
  // TODO: Support privateKey if necessary.
  privateKey?: string;
  mnemonic?: string;
  walletConfig: WalletConfig;
  walletStatus?: WalletStatus;
  constructor(
    address: string,
    mnemonic: string,
    name: string,
    walletConfig: WalletConfig,
    walletStatus?: WalletStatus,
  ) {
    this.address = address;
    this.mnemonic = mnemonic;
    this.name = name;
    this.icon = "Not Using";
    this.walletStatus = walletStatus;
    this.walletConfig = walletConfig;
  }
}

export enum TokenType {
  NativeCKB,
  sUDT,
  xUDT,
  Customized,
}
