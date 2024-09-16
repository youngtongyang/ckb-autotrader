import { Strategy } from "parameters";
import { DefaultWallet } from "./walletRegistry";

export const MainStrategy: Strategy = {
  strategy_name: "",
  wallets: [DefaultWallet],
};

export const StrategyRegistry: Strategy[] = [MainStrategy];
