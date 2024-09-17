import { WalletStatus } from "@app/schemas";
import { Wallet } from "@ckb-ccc/core";

export class Strategy {
  strategyName: string;
  wallets: Wallet[];
}

export class WalletConfig {
  privateKey: string;
  balanceConfig?: BalanceConfig[];
  constructor(privateKey: string, balanceConfig: BalanceConfig[]) {
    this.privateKey = privateKey;
    this.balanceConfig = balanceConfig;
  }
}

export class BalanceConfig {
  symbol: string;
  portionInStrategy?: number;
  portionInWallet?: number;
}

export class CMMWallet implements Wallet {
  name: string;
  icon: string;
  address: string;
  walletConfig: WalletConfig;
  walletStatus?: WalletStatus;
  constructor(
    address: string,
    walletConfig: WalletConfig,
    walletStatus?: WalletStatus,
  ) {
    this.address = address;
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
