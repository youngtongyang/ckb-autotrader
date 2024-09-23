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

  const redistributionsReferences: {
    address: string;
    tokenSymbol: string;
    difference: number;
    priceInCKB: number;
  }[] = [];
  /* redistributeTokensWithinWallet | Calculate sumOfTokenValueIn CKB */
  let sumOfTokenValuesInCKB: bigint = BigInt(0);
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
      sumOfTokenValuesInCKB += BigInt(Math.floor(updatedBalance / 10 ** 8));
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
      if (matchingPoolSnapshot.assetXSymbol === "CKB") {
        const tokenDecimals = scenarioSnapshot.poolInfos.find(
          (poolInfo) => poolInfo.assetY.symbol === config.balanceConfig.symbol,
        )?.assetY.decimals;
        if (!tokenDecimals) {
          strategyService.logger.error(
            `redistributeTokensWithinWallet | Token decimals not found for token ${config.balanceConfig.symbol}`,
          );
          throw Error(
            `redistributeTokensWithinWallet | Token decimals not found for token ${config.balanceConfig.symbol}`,
          );
        }
        sumOfTokenValuesInCKB += BigInt(
          Math.floor(
            (updatedBalance / 10 ** tokenDecimals) *
              Number(matchingPoolSnapshot.unitSellPrice),
          ),
        );
      } else {
        const tokenDecimals = scenarioSnapshot.poolInfos.find(
          (poolInfo) => poolInfo.assetX.symbol === config.balanceConfig.symbol,
        )?.assetX.decimals;
        if (!tokenDecimals) {
          strategyService.logger.error(
            `redistributeTokensWithinWallet | Token decimals not found for token ${config.balanceConfig.symbol}`,
          );
          throw Error(
            `redistributeTokensWithinWallet | Token decimals not found for token ${config.balanceConfig.symbol}`,
          );
        }
        sumOfTokenValuesInCKB = BigInt(
          Math.floor(
            (updatedBalance / 10 ** tokenDecimals) *
              Number(BigInt(matchingPoolSnapshot.unitBuyPrice)),
          ),
        );
      }
    }
    strategyService.logger.debug(
      `redistributeTokensWithinWallet | Token ${config.balanceConfig.symbol} with balance ${updatedBalance} has value ${sumOfTokenValuesInCKB} in CKB in wallet ${targetWalletStatus.address}`,
    );
    if (sumOfTokenValuesInCKB === BigInt(0)) {
      strategyService.logger.warn(
        `redistributeTokensWithinWallet | Token ${config.balanceConfig.symbol} has 0 value in CKB in wallet ${targetWalletStatus.address}. This should not happen.`,
      );
      throw Error(
        `redistributeTokensWithinWallet | Token ${config.balanceConfig.symbol} has 0 value in CKB in wallet ${targetWalletStatus.address}. This should not happen.`,
      );
    }
  }

  /* redistributeTokensWithinWallet | Calculate sumOfPortions */
  let sumOfPortions: number = 0;
  for (const config of activeBalanceConfigs) {
    if (config.balanceConfig.portionInStrategy === undefined) {
      strategyService.logger.warn(
        `redistributeTokensWithinWallet | Portion in strategy not defined for token ${config.balanceConfig.symbol} in wallet ${config.address}. Will skip strategyService token.`,
      );
      continue;
    }
    sumOfPortions += config.balanceConfig.portionInStrategy;
  }

  /* redistributeTokensWithinWallet | Calculate target balances and generate redistribution reference */
  for (const config of activeBalanceConfigs) {
    if (config.balanceConfig.portionInStrategy === undefined) {
      continue;
    }
    const portion = config.balanceConfig.portionInStrategy;
    let targetBalance: bigint = BigInt(0);
    let priceInCKB: number = 0;
    if (config.balanceConfig.symbol === "CKB") {
      targetBalance = BigInt(
        Math.floor(Number(sumOfTokenValuesInCKB) * (portion / sumOfPortions)) *
          10 ** 8,
      );
      priceInCKB = 1;
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
      const tokenDecimals =
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
    if (priceInCKB === 0) {
      strategyService.logger.error(
        `redistributeTokensWithinWallet | Price in CKB is 0 for token ${config.balanceConfig.symbol}. This should not happen.`,
      );
      throw Error(
        `redistributeTokensWithinWallet | Price in CKB is 0 for token ${config.balanceConfig.symbol}. This should not happen.`,
      );
    }
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
    const difference =
      Number(targetBalance) -
      (Number(matchingBalance.balance) + sumOfMatchingPendingBalanceChanges);
    if (difference === 0) {
      // TODO: Implement tolerance
      continue;
    }
    redistributionsReferences.push({
      address: config.address,
      tokenSymbol: config.balanceConfig.symbol,
      difference,
      priceInCKB,
    });
  }
  strategyService.logger.debug(
    "redistributeTokensWithinWallet | Redistribution References:",
  );
  for (const reference of redistributionsReferences) {
    strategyService.logger.debug(
      `Token: ${reference.tokenSymbol}, Difference: ${reference.difference}, DifferenceInCKB: ${Number(reference.difference) * reference.priceInCKB}, Address: ${reference.address},`,
    );
  }
  /* redistributeTokensWithinWallet | Generate actions based on redistribution references */
  while (redistributionsReferences.length > 0) {
    const maxGiver = redistributionsReferences.reduce((prev, curr) =>
      Number(prev.difference) * prev.priceInCKB >
      Number(curr.difference) * curr.priceInCKB
        ? prev
        : curr,
    );
    const maxReceiver = redistributionsReferences.reduce((prev, curr) =>
      Number(prev.difference) * prev.priceInCKB <
      Number(curr.difference) * curr.priceInCKB
        ? prev
        : curr,
    );
    if (maxGiver.difference === 0 || maxReceiver.difference === 0) {
      // TODO: Implement tolerance
      break;
    }
    const amountInCKBToSwap = Math.min(
      Math.abs(Number(maxGiver.difference) * maxGiver.priceInCKB),
      Math.abs(Number(maxReceiver.difference) * maxGiver.priceInCKB),
    );
    const amountToSwap = Math.floor(amountInCKBToSwap / maxGiver.priceInCKB);

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
            assetXSymbol: maxGiver.tokenSymbol,
            assetYSymbol: maxReceiver.tokenSymbol,
          },
        ],
        actionType: ActionType.Swap,
        actionStatus: ActionStatus.NotStarted,
      });
      scenarioSnapshot.actions.push(newAction);
    } else {
      matchingAction.targets.push({
        targetAddress: maxReceiver.address,
        amount: amountToSwap.toString(),
        assetXSymbol: maxGiver.tokenSymbol,
        assetYSymbol: maxReceiver.tokenSymbol,
      });
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
    maxGiver.difference -= amountToSwap;
    maxReceiver.difference += Math.floor(
      amountInCKBToSwap / maxReceiver.priceInCKB,
    );
    if (compareWithTolerance(maxGiver.difference, 0)) {
      redistributionsReferences.splice(
        redistributionsReferences.findIndex(
          (reference) =>
            reference.address === maxGiver.address &&
            reference.tokenSymbol === maxGiver.tokenSymbol,
        ),
        1,
      );
    }
    if (compareWithTolerance(maxReceiver.difference, 0)) {
      redistributionsReferences.splice(
        redistributionsReferences.findIndex(
          (reference) =>
            reference.address === maxReceiver.address &&
            reference.tokenSymbol === maxReceiver.tokenSymbol,
        ),
        1,
      );
    }
    strategyService.logger.debug(
      `redistributeTokensAcrossWallets | Swap ${amountToSwap} ${maxGiver.tokenSymbol} from ${maxGiver.address} to ${maxReceiver.address}`,
    );
  }
  return;
}
