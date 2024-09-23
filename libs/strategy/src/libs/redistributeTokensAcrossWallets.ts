import {
  ActionStatus,
  ActionType,
  ScenarioSnapshot,
  WalletStatus,
} from "@app/schemas";
import { BalanceConfig } from "parameters";
import { walletRegistry } from "parameters/walletRegistry";
import { StrategyService } from "../strategy.service";

export async function redistributeTokensAcrossWallets(
  strategyService: StrategyService,
  scenarioSnapshot: ScenarioSnapshot,
  tokenSymbols: string[],
): Promise<void> {
  const activeBalanceConfigs: {
    address: string;
    balanceConfig: BalanceConfig;
  }[] = [];
  /* redistributeTokensAcrossWallets | Load relevant balance configs */
  for (const walletStatus of scenarioSnapshot.walletStatuses) {
    const matchingWallet = walletRegistry.find(
      (wallet) => wallet.address === walletStatus.address,
    );
    if (!matchingWallet) {
      strategyService.logger.error(
        `redistributeTokensAcrossWallets | Wallet ${walletStatus.address} not found in wallet registry`,
      );
      continue;
    }
    if (matchingWallet.walletConfig.balanceConfig === undefined) {
      continue;
    }
    for (const balanceConfig of matchingWallet.walletConfig.balanceConfig) {
      activeBalanceConfigs.push({
        address: walletStatus.address,
        balanceConfig,
      });
    }
  }
  const redistributionsReferences: {
    address: string;
    tokenSymbol: string;
    difference: number;
  }[] = [];

  for (const tokenSymbol of tokenSymbols) {
    const matchingConfigs = activeBalanceConfigs.filter(
      (config) => config.balanceConfig.symbol === tokenSymbol,
    );
    const walletsInvolved: WalletStatus[] = [];
    for (const config of matchingConfigs) {
      const walletStatus = scenarioSnapshot.walletStatuses.find(
        (walletStatus) => walletStatus.address === config.address,
      );
      if (!walletStatus) {
        strategyService.logger.error(
          `redistributeTokensAcrossWallets | Wallet ${config.address} not found in scenario snapshot`,
        );
        continue;
      }
      walletsInvolved.push(walletStatus);
    }
    /* redistributeTokensAcrossWallets | Calculate sumOfTokens */
    let sumOfTokens: bigint = BigInt(0);
    for (const walletStatus of walletsInvolved) {
      const matchingBalance = walletStatus.tokenBalances.find(
        (balance) => balance.symbol === tokenSymbol,
      );
      if (!matchingBalance) {
        strategyService.logger.error(
          `redistributeTokensAcrossWallets | Token ${tokenSymbol} not found in wallet ${walletStatus.address}`,
        );
        continue;
      }
      const matchingPendingBalanceChanges =
        scenarioSnapshot.pendingBalanceChanges.filter(
          (change) =>
            change.address === walletStatus.address &&
            change.symbol === tokenSymbol,
        );
      const sumOfMatchingPendingBalanceChanges =
        matchingPendingBalanceChanges.reduce(
          (prev, curr) => prev + curr.balanceChange,
          0,
        );
      if (!matchingBalance) {
        strategyService.logger.error(
          `redistributeTokensWithinWallet | Token ${tokenSymbol} not found in wallet ${walletStatus.address}`,
        );
        throw Error(
          `redistributeTokensWithinWallet | Token ${tokenSymbol} not found in wallet ${walletStatus.address}`,
        );
      }
      const updatedBalance =
        Number(matchingBalance.balance) + sumOfMatchingPendingBalanceChanges;
      sumOfTokens += BigInt(updatedBalance);
    }
    /* redistributeTokensAcrossWallets | Calculate sumOfPortions */
    let sumOfPortions: number = 0;
    for (const config of matchingConfigs) {
      if (config.balanceConfig.portionInStrategy === undefined) {
        strategyService.logger.error(
          `redistributeTokensAcrossWallets | Portion in strategy not defined for token ${tokenSymbol} in wallet ${config.address}`,
        );
        continue;
      }
      sumOfPortions += config.balanceConfig.portionInStrategy;
    }
    /* redistributeTokensAcrossWallets | Calculate target balances and generate redistribution reference */
    for (const config of matchingConfigs) {
      if (config.balanceConfig.portionInStrategy === undefined) {
        strategyService.logger.error(
          `redistributeTokensAcrossWallets | Portion in strategy not defined for token ${tokenSymbol} in wallet ${config.address}`,
        );
        continue;
      }
      const portion = config.balanceConfig.portionInStrategy;
      const targetBalance = (Number(sumOfTokens) * portion) / sumOfPortions;
      const matchingBalance = walletsInvolved
        .find((walletStatus) => walletStatus.address === config.address)
        ?.tokenBalances.find((balance) => balance.symbol === tokenSymbol);
      if (!matchingBalance) {
        strategyService.logger.error(
          `redistributeTokensAcrossWallets | Token ${tokenSymbol} not found in wallet ${config.address}`,
        );
        continue;
      }
      const matchingPendingBalanceChanges =
        scenarioSnapshot.pendingBalanceChanges.filter(
          (change) =>
            change.address === config.address && change.symbol === tokenSymbol,
        );
      const sumOfMatchingPendingBalanceChanges =
        matchingPendingBalanceChanges.reduce(
          (prev, curr) => prev + curr.balanceChange,
          0,
        );
      const difference =
        targetBalance -
        (Number(matchingBalance.balance) + sumOfMatchingPendingBalanceChanges);
      if (difference === 0) {
        // TODO: Implement tolerance
        continue;
      }
      redistributionsReferences.push({
        address: config.address,
        tokenSymbol,
        difference,
      });
    }
  }
  strategyService.logger.debug(
    "redistributeTokensAcrossWallets | Redistribution References:",
  );
  for (const reference of redistributionsReferences) {
    strategyService.logger.debug(
      `Token: ${reference.tokenSymbol}, Difference: ${reference.difference}, Address: ${reference.address},`,
    );
  }

  for (const tokenSymbol of tokenSymbols) {
    const matchingRedistributionReferences = redistributionsReferences.filter(
      (reference) => reference.tokenSymbol === tokenSymbol,
    );
    /* redistributeTokensAcrossWallets | Generate actions based on redistribution references */
    // Note: Recursively, try to take from the wallet that is giving out the most and give to the wallet that is receiving the most. This is a naive approach and can be improved.
    while (matchingRedistributionReferences.length > 0) {
      const maxGiver = matchingRedistributionReferences.reduce((prev, curr) =>
        prev.difference < curr.difference ? prev : curr,
      );
      const maxReceiver = matchingRedistributionReferences.reduce(
        (prev, curr) => (prev.difference > curr.difference ? prev : curr),
      );
      if (maxGiver.difference === 0 || maxReceiver.difference === 0) {
        break;
      }
      const amountToTransfer = Math.min(
        Math.abs(maxGiver.difference),
        Math.abs(maxReceiver.difference),
      );
      const matchingAction = scenarioSnapshot.actions.find(
        (action) => action.actorAddress === maxGiver.address,
      );
      if (!matchingAction) {
        const newAction = strategyService.actionRepo.create({
          scenarioSnapshot: scenarioSnapshot,
          actorAddress: maxGiver.address,
          targets: [
            {
              targetAddress: maxReceiver.address,
              amount: amountToTransfer.toString(),
              assetXSymbol: tokenSymbol,
              assetYSymbol: tokenSymbol,
            },
          ],
          actionType: ActionType.Transfer,
          actionStatus: ActionStatus.NotStarted,
        });
        scenarioSnapshot.actions.push(newAction);
        strategyService.logger.debug(
          `redistributeTokensAcrossWallets | New Action Generated: ${newAction.actorAddress} transferring ${newAction.targets[0].amount} ${newAction.targets[0].assetXSymbol} to ${newAction.targets[0].targetAddress}`,
        );
      } else {
        matchingAction.targets.push({
          targetAddress: maxReceiver.address,
          amount: amountToTransfer.toString(),
          assetXSymbol: tokenSymbol,
          assetYSymbol: tokenSymbol,
        });
        strategyService.logger.debug(
          `redistributeTokensAcrossWallets | Existing Action Updated: ${matchingAction.actorAddress} transferring ${amountToTransfer} ${tokenSymbol} to ${maxReceiver.address}`,
        );
      }
      scenarioSnapshot.pendingBalanceChanges.push({
        address: maxGiver.address,
        symbol: maxGiver.tokenSymbol,
        balanceChange: -amountToTransfer,
      });
      scenarioSnapshot.pendingBalanceChanges.push({
        address: maxReceiver.address,
        symbol: maxReceiver.tokenSymbol,
        balanceChange: amountToTransfer,
      });
      // Drop the giver and receiver from the list if difference has been reduced to 0
      maxGiver.difference += amountToTransfer;
      maxReceiver.difference -= amountToTransfer;
      if (maxGiver.difference === 0) {
        redistributionsReferences.splice(
          redistributionsReferences.findIndex(
            (reference) =>
              reference.address === maxGiver.address &&
              reference.tokenSymbol === tokenSymbol,
          ),
          1,
        );
      }
      if (maxReceiver.difference === 0) {
        redistributionsReferences.splice(
          redistributionsReferences.findIndex(
            (reference) =>
              reference.address === maxReceiver.address &&
              reference.tokenSymbol === tokenSymbol,
          ),
          1,
        );
      }
    }
  }
  return;
}
