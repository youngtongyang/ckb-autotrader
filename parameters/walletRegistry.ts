import { Wallet } from "parameters";
import { MainWalletConfig } from "./walletConfigRegistry";

export const DefaultWallet: Wallet = {
  address: "ckt1qyqyph8v9mclls35p6m4l3v4vzj",
  walletConfig: MainWalletConfig,
};

export const walletRegistry: Wallet[] = [DefaultWallet];
