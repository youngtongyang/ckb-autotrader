import { Strategy } from "parameters";
import { DefaultWallet, SecondWallet, ThirdWallet } from "./walletRegistry";

/* Note: Feel free to extend this type for your own strategy

*/
export const MainStrategy: Strategy = {
  strategyName: "",
  wallets: [DefaultWallet, SecondWallet, ThirdWallet],
};

export const StrategyRegistry: Strategy[] = [MainStrategy];
