import { WalletStatus } from "@app/schemas";
import { Wallet } from "@ckb-ccc/core";

export class Strategy {
  strategyName: string;
  wallets: Wallet[];
}

export class WalletConfig {
  privateKey: string;
  balanceConfig?: { symbol: string; portion: number }[];
  constructor(
    privateKey: string,
    balanceConfig: { symbol: string; portion: number }[],
  ) {
    this.privateKey = privateKey;
    this.balanceConfig = balanceConfig;
  }
}

export class CMMWallet implements Wallet {
  name: string;
  icon: string;
  address: string;
  walletConfig: WalletConfig;
  walletStatus?: WalletStatus;
  constructor(
    address: string,
    wallet_config: WalletConfig,
    wallet_status?: WalletStatus,
  ) {
    this.address = address;
    this.walletStatus = wallet_status;
    this.walletConfig = wallet_config;
  }
}

export enum TokenType {
  NativeCKB,
  sUDT,
  xUDT,
  Customized,
}
