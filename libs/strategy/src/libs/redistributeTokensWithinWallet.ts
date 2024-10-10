import { compareWithTolerance } from "@app/commons";
import {
  ActionStatus,
  ActionType,
  ScenarioSnapshot,
  WalletStatus,
} from "@app/schemas";
import { BalanceConfig } from "parameters";
import { walletRegistry } from "parameters/walletRegistry";
import { StrategyService } from "../strategy.service";

export async function redistributeTokensWithinWallet(
  strategyService: StrategyService,
  scenarioSnapshot: ScenarioSnapshot,
  targetWalletStatus: WalletStatus,
): Promise<void> {
  /* redistributeTokensWithinWallet | Load relevant balance configs*/
  const activeBalanceConfigs: {
    address: string;
    balanceConfig: BalanceConfig;
  }[] = [];
  const matchingWallet = walletRegistry.find(
    (wallet) => wallet.address === targetWalletStatus.address,
  );
  if (!matchingWallet) {
    strategyService.logger.error(
      `redistributeTokensWithinWallet | Wallet ${targetWalletStatus.address} not found in wallet registry`,
    );
    throw Error(
      `redistributeTokensWithinWallet | Wallet ${targetWalletStatus.address} not found in wallet registry`,
    );
  }
  if (matchingWallet.walletConfig.balanceConfig === undefined) {
    strategyService.logger.warn(
      `redistributeTokensWithinWallet | Wallet ${targetWalletStatus.address} has no balanceConfig`,
    );
    return;
  }
  for (const balanceConfig of matchingWallet.walletConfig.balanceConfig) {
    activeBalanceConfigs.push({
      address: targetWalletStatus.address,
      balanceConfig,
    });
  }

  const redistributionReferences: {
    address: string;
    tokenSymbol: string;
    tokenDecimals: number;
    difference: number;
    priceInCKB: number;
  }[] = [];
  /* redistributeTokensWithinWallet | Calculate sumOfTokenValueIn CKB */
  let sumOfTokenValuesInCKB: number = 0;
  for (const config of activeBalanceConfigs) {
    const matchingBalance = targetWalletStatus.tokenBalances.find(
      (balance) => balance.symbol === config.balanceConfig.symbol,
    );
    const matchingPendingBalanceChanges =
      scenarioSnapshot.pendingBalanceChanges.filter(
        (change) =>
          change.address === targetWalletStatus.address &&
          change.symbol === config.balanceConfig.symbol,
      );
    const sumOfMatchingPendingBalanceChanges =
      matchingPendingBalanceChanges.reduce(
        (prev, curr) => prev + curr.balanceChange,
        0,
      );
    if (!matchingBalance) {
      strategyService.logger.error(
        `redistributeTokensWithinWallet | Token ${config.balanceConfig.symbol} not found in wallet ${targetWalletStatus.address}`,
      );
      throw Error(
        `redistributeTokensWithinWallet | Token ${config.balanceConfig.symbol} not found in wallet ${targetWalletStatus.address}`,
      );
    }
    const updatedBalance =
      Number(matchingBalance.balance) + sumOfMatchingPendingBalanceChanges;
    if (config.balanceConfig.symbol === "CKB") {
      strategyService.logger.verbose(
        `redistributeTokensWithinWallet | The value of Token ${config.balanceConfig.symbol} is ${updatedBalance / 10 ** 8} in CKB in wallet ${targetWalletStatus.address}`,
      );
      sumOfTokenValuesInCKB += updatedBalance / 10 ** 8;
    } else {
      const matchingPoolSnapshot = scenarioSnapshot.poolSnapshots.find(
        (poolSnapshot) =>
          (poolSnapshot.assetYSymbol === "CKB" &&
            poolSnapshot.assetXSymbol === config.balanceConfig.symbol) ||
          (poolSnapshot.assetYSymbol === config.balanceConfig.symbol &&
            poolSnapshot.assetXSymbol === "CKB"),
      );
      if (!matchingPoolSnapshot) {
        strategyService.logger.error(
          `redistributeTokensWithinWallet | Pool snapshot not found for token ${config.balanceConfig.symbol}/CKB`,
        );
        throw Error(
          `redistributeTokensWithinWallet | Pool snapshot not found for token ${config.balanceConfig.symbol}/CKB`,
        );
      }
      const matchingPoolInfo = scenarioSnapshot.poolInfos.find(
        (poolInfo) => poolInfo.typeHash === matchingPoolSnapshot.typeHash,
      );
      if (!matchingPoolInfo) {
        strategyService.logger.error(
          `redistributeTokensWithinWallet | Pool info not found for token ${config.balanceConfig.symbol}/CKB`,
        );
        throw Error(
          `redistributeTokensWithinWallet | Pool info not found for token ${config.balanceConfig.symbol}/CKB`,
        );
      }
      const tokenDecimals =
        matchingPoolInfo.assetX.symbol === config.balanceConfig.symbol
          ? matchingPoolInfo.assetX.decimals
          : matchingPoolInfo.assetY.decimals;
      if (!tokenDecimals) {
        strategyService.logger.error(
          `redistributeTokensWithinWallet | Token decimals not found for token ${config.balanceConfig.symbol}`,
        );
        throw Error(
          `redistributeTokensWithinWallet | Token decimals not found for token ${config.balanceConfig.symbol}`,
        );
      }
      if (matchingPoolSnapshot.assetXSymbol === "CKB") {
        const valueOfSymbolInCKB =
          (updatedBalance / 10 ** tokenDecimals) *
          Number(matchingPoolSnapshot.unitSellPrice);
        strategyService.logger.verbose(
          `redistributeTokensWithinWallet | The value of Token ${config.balanceConfig.symbol} is ${valueOfSymbolInCKB} in CKB in wallet ${targetWalletStatus.address}`,
        );
        sumOfTokenValuesInCKB += valueOfSymbolInCKB;
      } else {
        const valueOfSymbolInCKB =
          (updatedBalance / 10 ** tokenDecimals) *
          Number(BigInt(matchingPoolSnapshot.unitBuyPrice));
        strategyService.logger.verbose(
          `redistributeTokensWithinWallet | The value of Token ${config.balanceConfig.symbol} is ${valueOfSymbolInCKB} in CKB in wallet ${targetWalletStatus.address}`,
        );
        sumOfTokenValuesInCKB = valueOfSymbolInCKB;
      }
    }
  }
  strategyService.logger.debug(
    `redistributeTokensWithinWallet | The value of all token with balance config is ${sumOfTokenValuesInCKB} in CKB in wallet ${targetWalletStatus.address}`,
  );

  /* redistributeTokensWithinWallet | Calculate sumOfPortions */
  let sumOfPortions: number = 0;
  for (const config of activeBalanceConfigs) {
    if (config.balanceConfig.portionInWallet === undefined) {
      strategyService.logger.warn(
        `redistributeTokensWithinWallet | Portion in strategy not defined for token ${config.balanceConfig.symbol} in wallet ${config.address}. This should not happen.`,
      );
      throw Error(
        `redistributeTokensWithinWallet | Portion in strategy not defined for token ${config.balanceConfig.symbol} in wallet ${config.address}. This should not happen.`,
      );
    }
    sumOfPortions += config.balanceConfig.portionInWallet;
  }

  /* redistributeTokensWithinWallet | Calculate target balances and generate redistribution reference */
  for (const config of activeBalanceConfigs) {
    if (config.balanceConfig.portionInWallet === undefined) {
      continue;
    }
    const portion = config.balanceConfig.portionInWallet;
    let targetBalance: bigint = BigInt(0);
    let tokenDecimals: number | undefined;
    let priceInCKB: number = 0;
    if (config.balanceConfig.symbol === "CKB") {
      targetBalance = BigInt(
        Math.floor(
          Number(sumOfTokenValuesInCKB) * (portion / sumOfPortions) * 10 ** 8,
        ),
      );
      priceInCKB = 1;
      tokenDecimals = 8;
    } else {
      const matchingPoolSnapshot = scenarioSnapshot.poolSnapshots.find(
        (poolSnapshot) =>
          (poolSnapshot.assetYSymbol === "CKB" &&
            poolSnapshot.assetXSymbol === config.balanceConfig.symbol) ||
          (poolSnapshot.assetYSymbol === config.balanceConfig.symbol &&
            poolSnapshot.assetXSymbol === "CKB"),
      );
      if (!matchingPoolSnapshot) {
        strategyService.logger.error(
          `redistributeTokensWithinWallet | Pool snapshot not found for token ${config.balanceConfig.symbol}`,
        );
        throw Error(
          `redistributeTokensWithinWallet | Pool snapshot not found for token ${config.balanceConfig.symbol}`,
        );
      }
      const matchingPoolInfo = scenarioSnapshot.poolInfos.find(
        (poolInfo) => poolInfo.typeHash === matchingPoolSnapshot.typeHash,
      );
      if (!matchingPoolInfo) {
        strategyService.logger.error(
          `redistributeTokensWithinWallet | Pool info not found for token ${config.balanceConfig.symbol}`,
        );
        throw Error(
          `redistributeTokensWithinWallet | Pool info not found for token ${config.balanceConfig.symbol}`,
        );
      }
      tokenDecimals =
        matchingPoolInfo?.assetX.symbol === "CKB"
          ? matchingPoolInfo.assetY.decimals
          : matchingPoolInfo.assetX.decimals;
      if (matchingPoolSnapshot.assetYSymbol === "CKB") {
        priceInCKB = Number(matchingPoolSnapshot.unitBuyPrice);
      } else {
        priceInCKB = Number(matchingPoolSnapshot.unitSellPrice);
      }
      targetBalance = BigInt(
        Math.floor(
          ((Number(sumOfTokenValuesInCKB) * (portion / sumOfPortions)) /
            priceInCKB) *
            10 ** tokenDecimals,
        ),
      );
    }
    if (tokenDecimals === undefined) {
      strategyService.logger.error(
        `redistributeTokensWithinWallet | Token decimals not found for token ${config.balanceConfig.symbol}`,
      );
      throw Error(
        `redistributeTokensWithinWallet | Token decimals not found for token ${config.balanceConfig.symbol}`,
      );
    }
    if (priceInCKB === 0) {
      strategyService.logger.error(
        `redistributeTokensWithinWallet | Price in CKB is 0 for token ${config.balanceConfig.symbol}. This should not happen.`,
      );
      throw Error(
        `redistributeTokensWithinWallet | Price in CKB is 0 for token ${config.balanceConfig.symbol}. This should not happen.`,
      );
    }
    strategyService.logger.verbose(
      `redistributeTokensWithinWallet | Target balance for token ${config.balanceConfig.symbol} is ${targetBalance} (${(Number(targetBalance) / 10 ** tokenDecimals) * priceInCKB} CKB) in wallet ${config.address}`,
    );
    if (targetBalance === BigInt(0)) {
      strategyService.logger.warn(
        `redistributeTokensWithinWallet | Target balance for token ${config.balanceConfig.symbol} is 0 in wallet ${config.address}. This should not happen.`,
      );
      continue;
    }

    const matchingBalance = targetWalletStatus.tokenBalances.find(
      (balance) => balance.symbol === config.balanceConfig.symbol,
    );
    if (!matchingBalance) {
      strategyService.logger.error(
        `redistributeTokensWithinWallet | Token ${config.balanceConfig.symbol} not found in wallet ${config.address}`,
      );
      throw Error(
        `redistributeTokensWithinWallet | Token ${config.balanceConfig.symbol} not found in wallet ${config.address}`,
      );
    }
    const matchingPendingBalanceChanges =
      scenarioSnapshot.pendingBalanceChanges.filter(
        (change) =>
          change.address === config.address &&
          change.symbol === config.balanceConfig.symbol,
      );
    const sumOfMatchingPendingBalanceChanges =
      matchingPendingBalanceChanges.reduce(
        (prev, curr) => prev + curr.balanceChange,
        0,
      );
    let difference =
      Number(targetBalance) -
      (Number(matchingBalance.balance) + sumOfMatchingPendingBalanceChanges);
    if (
      compareWithTolerance(
        Number(targetBalance),
        Number(matchingBalance.balance),
        0.5,
        10 * 2,
      )
    ) {
      strategyService.logger.debug(
        `redistributeTokensWithinWallet | ${config.balanceConfig.symbol} compareWithTolerance result no need action`,
      );
      difference = 0;
      continue;
    }
    redistributionReferences.push({
      address: config.address,
      tokenSymbol: config.balanceConfig.symbol,
      tokenDecimals,
      difference,
      priceInCKB,
    });
  }
  strategyService.logger.debug(
    "redistributeTokensWithinWallet | Redistribution References: redistributionReferences length is " + redistributionReferences.length,
  );
  if (redistributionReferences.length > 1) {
    for (const reference of redistributionReferences) {
      strategyService.logger.debug(
        `Token: ${reference.tokenSymbol}, DifferenceInBalance: ${reference.difference}, DifferenceInCKB: ${(Number(reference.difference) / 10 ** reference.tokenDecimals) * reference.priceInCKB}, Address: ${reference.address},`,
      );
    }
  }
  /* redistributeTokensWithinWallet | Generate actions based on redistribution references */
  while (redistributionReferences.length > 1) {
    const maxGiver = redistributionReferences.reduce((prev, curr) =>
      Number(prev.difference / 10 ** prev.tokenDecimals) * prev.priceInCKB <
      Number(curr.difference / 10 ** prev.tokenDecimals) * curr.priceInCKB
        ? prev
        : curr,
    );
    const maxReceiver = redistributionReferences.reduce((prev, curr) =>
      Number(prev.difference / 10 ** prev.tokenDecimals) * prev.priceInCKB >
      Number(curr.difference / 10 ** curr.tokenDecimals) * curr.priceInCKB
        ? prev
        : curr,
    );
    if (
      compareWithTolerance(
        (maxGiver.difference / 10 ** maxGiver.tokenDecimals) *
          maxGiver.priceInCKB,
        0,
        undefined,
        10 ** 2,
      ) ||
      compareWithTolerance(
        (maxReceiver.difference / 10 ** maxReceiver.tokenDecimals) *
          maxReceiver.priceInCKB,
        0,
        undefined,
        10 ** 2,
      )
    ) {
      break;
    }
    const amountInCKBToSwap = Math.min(
      Math.abs(
        Number(maxGiver.difference / 10 ** maxGiver.tokenDecimals) *
          maxGiver.priceInCKB,
      ),
      Math.abs(
        Number(maxReceiver.difference / 10 ** maxReceiver.tokenDecimals) *
          maxReceiver.priceInCKB,
      ),
    );
    const amountToSwap = Number(
      (
        (amountInCKBToSwap * 10 ** maxGiver.tokenDecimals) /
        maxGiver.priceInCKB
      ).toFixed(maxGiver.tokenDecimals),
    );
    const matchingAction = scenarioSnapshot.actions.find(
      (action) =>
        action.actorAddress === maxGiver.address &&
        action.actionType === ActionType.Swap,
    );
    if (!matchingAction) {
      const newAction = strategyService.actionRepo.create({
        scenarioSnapshot: scenarioSnapshot,
        actorAddress: maxGiver.address,
        targets: [
          {
            targetAddress: maxReceiver.address,
            amount: amountToSwap.toString(),
            originalAssetSymbol: maxGiver.tokenSymbol,
            originalAssetTokenDecimals: maxGiver.tokenDecimals,
            targetAssetSymbol: maxReceiver.tokenSymbol,
            targetAssetTokenDecimals: maxReceiver.tokenDecimals,
          },
        ],
        actionType: ActionType.Swap,
        actionStatus: ActionStatus.NotStarted,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      scenarioSnapshot.actions.push(newAction);
    } else {
      strategyService.logger.error(
        `redistributeTokensWithinWallet | Swap action already exists for ${maxGiver.address}. Multi-target swapping in one transaction is not currently supported.`,
      );
      throw Error(
        `redistributeTokensWithinWallet | Swap action already exists for ${maxGiver.address}. Multi-target swapping in one transaction is not currently supported.`,
      );
    }
    scenarioSnapshot.pendingBalanceChanges.push({
      address: maxGiver.address,
      symbol: maxGiver.tokenSymbol,
      balanceChange: -amountToSwap,
    });
    scenarioSnapshot.pendingBalanceChanges.push({
      address: maxReceiver.address,
      symbol: maxReceiver.tokenSymbol,
      balanceChange: amountInCKBToSwap / maxReceiver.priceInCKB,
    });
    // Drop the giver and receiver from the list if difference has been reduced to 0
    maxGiver.difference += amountToSwap;
    maxReceiver.difference -=
      (amountInCKBToSwap / maxReceiver.priceInCKB) *
      10 ** maxReceiver.tokenDecimals;
    if (Math.abs(maxGiver.difference) < Math.abs(maxReceiver.difference)) {
      redistributionReferences.splice(
        redistributionReferences.findIndex(
          (reference) =>
            reference.address === maxGiver.address &&
            reference.tokenSymbol === maxGiver.tokenSymbol,
        ),
        1,
      );
    } else {
      redistributionReferences.splice(
        redistributionReferences.findIndex(
          (reference) =>
            reference.address === maxReceiver.address &&
            reference.tokenSymbol === maxReceiver.tokenSymbol,
        ),
        1,
      );
    }
    strategyService.logger.debug(
      `redistributeTokensWithinWallets | Swap ${amountToSwap} ${maxGiver.tokenSymbol} into ${amountInCKBToSwap / maxReceiver.priceInCKB} ${maxReceiver.tokenSymbol} from ${maxGiver.address} to ${maxReceiver.address}`,
    );
  }
  return;
}
