import { BalanceConfig, WalletConfig } from "parameters";

export const MainWalletConfig: WalletConfig = {
  balanceConfig: [new BalanceConfig("CKB", 1, 1)],
};

export const WalletConfigRegistry: WalletConfig[] = [MainWalletConfig];
