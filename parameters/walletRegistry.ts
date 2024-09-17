import { CMMWallet } from "parameters";
import { MainWalletConfig } from "./walletConfigRegistry";

export const DefaultWallet: CMMWallet = {
  name: "",
  icon: "",
  address: "ckt1qyqyph8v9mclls35p6m4l3v4vzj",
  walletConfig: MainWalletConfig,
};

export const walletRegistry: CMMWallet[] = [DefaultWallet];
