import { Strategy } from "parameters";
import { DefaultWallet } from "./walletRegistry.example";

/* Note: Feel free to extend this type for your own strategy

*/
export const MainStrategy: Strategy = {
  strategyName: "",
  wallets: [DefaultWallet],
};

export const StrategyRegistry: Strategy[] = [MainStrategy];
