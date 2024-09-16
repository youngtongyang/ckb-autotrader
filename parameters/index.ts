import { WalletStatus } from "@app/schemas";

export class Strategy {
  strategy_name: string;
  wallets: Wallet[];
}

export class WalletConfig {
  private_key: string;
  balance_config?: { symbol: string; portion: number }[];
  constructor(
    private_key: string,
    balance_config: { symbol: string; portion: number }[],
  ) {
    this.private_key = private_key;
    this.balance_config = balance_config;
  }
}

export class Wallet {
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

export class TokenDefinition {
  symbol: string;
  name: string;
  type: TokenType;
  decimals: number;
  typeCodeHash?: string;
  typeArgs?: string;
  typeHash?: string;
  constructor(
    symbol: string,
    name: string,
    type: TokenType,
    decimals: number,
    typeCodeHash?: string,
    typeArgs?: string,
    typeHash?: string,
  ) {
    this.symbol = symbol;
    this.name = name;
    this.type = type;
    this.decimals = decimals;
    this.typeCodeHash = typeCodeHash;
    this.typeArgs = typeArgs;
    this.typeHash = typeHash;
    switch (type) {
      case TokenType.NativeCKB:
        this.typeCodeHash = "";
        this.typeArgs = "";
        this.typeHash = "";
      // TODO: Connect to the real contracts
      case TokenType.sUDT:
        this.typeCodeHash = "";
        this.typeArgs = "";
        this.typeHash = "";
      case TokenType.xUDT:
        this.typeCodeHash = "";
        this.typeArgs = "";
        this.typeHash = "";
    }
  }
}

export enum TokenType {
  NativeCKB,
  sUDT,
  xUDT,
  Customized,
}
