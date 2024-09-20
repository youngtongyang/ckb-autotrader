import { BalanceConfig, WalletConfig } from "parameters";

export const MainWalletConfig: WalletConfig = {
  balanceConfig: [
    new BalanceConfig("CKB", 1, 1),
    new BalanceConfig("RUSD", 1, 1),
  ],
};

export const SecondWalletConfig: WalletConfig = {
  balanceConfig: [
    new BalanceConfig("CKB", 0.5, 0.5),
    new BalanceConfig("RUSD", 0.5, 0.5),
  ],
};
export const WalletConfigRegistry: WalletConfig[] = [
  MainWalletConfig,
  SecondWalletConfig,
];
