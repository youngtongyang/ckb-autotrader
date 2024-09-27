import { BalanceConfig, WalletConfig } from "parameters";

// TODO: Limit symbols to tokenRegistry.
export const MainWalletConfig: WalletConfig = {
  balanceConfig: [
    new BalanceConfig("CKB", 1, 2),
    // new BalanceConfig("RUSD", 1, 1),
    new BalanceConfig("SEAL", 1, 1),
  ],
};

export const SecondWalletConfig: WalletConfig = {
  balanceConfig: [
    new BalanceConfig("CKB", 0.5, 0.5),
    new BalanceConfig("SEAL", 0.1, 0.1),
  ],
};
export const WalletConfigRegistry: WalletConfig[] = [
  MainWalletConfig,
  SecondWalletConfig,
];
