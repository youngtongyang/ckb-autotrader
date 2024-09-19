import { CMMWallet } from "parameters";
import { MainWalletConfig } from "./walletConfigRegistry";

export const DefaultWallet: CMMWallet = {
  name: "",
  icon: "",
  address:
    "ckt1qrejnmlar3r452tcg57gvq8patctcgy8acync0hxfnyka35ywafvkqgjcmq8v0sgp3ckqvvcu5df3r2phss8h2r4qq77wnyl",
  walletConfig: MainWalletConfig,
};

export const walletRegistry: CMMWallet[] = [DefaultWallet];
