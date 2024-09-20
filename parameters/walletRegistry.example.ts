import { CMMWallet } from "parameters";
import { MainWalletConfig } from "./walletConfigRegistry";

export const DefaultWallet: CMMWallet = {
  name: "",
  icon: "",
  address:
    "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq2jk6pyw9vlnfakx7vp4t5lxg0lzvvsp3c5adflu",
  mnemonic: "",
  walletConfig: MainWalletConfig,
};

export const SecondWallet: CMMWallet = {
  name: "",
  icon: "",
  address:
    "ckt1qrejnmlar3r452tcg57gvq8patctcgy8acync0hxfnyka35ywafvkqgjqfl952m2zt6u0hyvqxvj9n6nzqjk03ezqqqwqqvl",
  mnemonic: "",
  walletConfig: MainWalletConfig,
};

export const walletRegistry: CMMWallet[] = [DefaultWallet, SecondWallet];
