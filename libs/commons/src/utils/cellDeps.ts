import { ClientCollectableSearchKeyLike } from "@ckb-ccc/core/dist.commonjs/advancedBarrel";

export const RUSDCellDepSearchKey: ClientCollectableSearchKeyLike = {
  script: {
    // TypeID
    codeHash:
      "0x00000000000000000000000000000000000000000000000000545950455f4944",
    hashType: "type",
    args: "0x97d30b723c0b2c66e9cb8d4d0df4ab5d7222cbb00d4a9a2055ce2e5d7f0d8b0f",
  },
  scriptType: "type",
  scriptSearchMode: "exact",
};

export enum ExtraCellDepEnum {
  RUSD = "RUSD",
}

export const extraCellDepSearchKeys = {
  RUSD: RUSDCellDepSearchKey,
};
