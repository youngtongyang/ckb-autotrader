import { CMMWallet } from "parameters";
import { MainWalletConfig, SecondWalletConfig } from "./walletConfigRegistry";

export const DefaultWallet: CMMWallet = {
  name: "Wallet 2",
  icon: "",
  address:
    "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqg7mkruq9gwjdxsgpw8yzmlvzecsqafcysjyrveq",
  privateKey: "",
  mnemonic: "",
  walletConfig: MainWalletConfig,
};

export const SecondWallet: CMMWallet = {
  name: "Wallet 3",
  icon: "",
  address:
    "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqdd3z25u024cj4d8rutkggjvw28r42rt0qx5z9aj",
  mnemonic: "",
  privateKey: "",
  walletConfig: SecondWalletConfig,
};

export const ThirdWallet: CMMWallet = {
  name: "Wallet 4",
  icon: "",
  address:
    "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqgtlcnzzna2tqst7jw78egjpujn7hdxpackjmmdp",
  mnemonic: "",
  privateKey: "",
  walletConfig: SecondWalletConfig,
};

export const FourthWallet: CMMWallet = {
  name: "Wallet 1",
  icon: "",
  address: "",
  privateKey: "",
  walletConfig: MainWalletConfig,
};

export const walletRegistry: CMMWallet[] = [
  DefaultWallet,
  SecondWallet,
  ThirdWallet,
  FourthWallet,
];
