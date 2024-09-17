import { Strategy } from "parameters";
import { DefaultWallet } from "./walletRegistry";

export const MainStrategy: Strategy = {
  strategyName: "",
  wallets: [DefaultWallet],
};

export const StrategyRegistry: Strategy[] = [MainStrategy];
