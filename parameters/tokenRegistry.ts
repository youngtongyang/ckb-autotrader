import { Token } from "@utxoswap/swap-sdk-js";

export const CKBToken: Token = {
  symbol: "CKB",
  decimals: 8,
  name: "CKB (Native)",
  typeHash: "",
};

export const USDTToken: Token = {
  symbol: "Token",
  decimals: 8,
  name: "USDT",
  typeHash: "",
};

export const RUSDToken: Token = {
  symbol: "Token",
  decimals: 8,
  name: "USDT",
  typeHash: "",
};

export const tokenRegistry: Token[] = [CKBToken, USDTToken, RUSDToken];
