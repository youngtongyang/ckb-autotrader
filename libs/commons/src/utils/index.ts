import { addressToScript } from "@nervosnetwork/ckb-sdk-utils";
import { Logger } from "@nestjs/common";
import { leToU128 } from "@rgbpp-sdk/ckb";
import { Collector } from "@utxoswap/swap-sdk-js";

export function sleep(time: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, time));
}

export function deduplicate<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export function autoRun(
  logger: Logger,
  autoIntervalMsRaw: string | number,
  handler: () => any,
) {
  const autoIntervalMs = Number(autoIntervalMsRaw);
  if (
    autoIntervalMs &&
    Number.isSafeInteger(autoIntervalMs) &&
    autoIntervalMs > 0
  ) {
    (async () => {
      while (true) {
        try {
          await handler();
        } catch (err) {
          logger.error(err.message, err.stack, err.context);
        }
        await sleep(autoIntervalMs);
      }
    })();
  }
}

export const getTokenBalance = async (
  collector: Collector,
  ckbAddress: string,
  type?: CKBComponents.Script,
) => {
  const fromLock = addressToScript(ckbAddress);
  let sumTokenAmount = BigInt(0);

  if (!type) {
    const ckbCells = await collector.getCells({
      lock: fromLock,
    });

    const emptyCells = ckbCells?.filter((cell) => !cell.output.type);

    if (!emptyCells || emptyCells.length === 0) {
      return sumTokenAmount;
    }
    for (const cell of emptyCells) {
      sumTokenAmount += BigInt(cell.output.capacity);
    }
    return sumTokenAmount;
  }

  const xudtCells = await collector.getCells({
    lock: fromLock,
    type,
  });

  if (!xudtCells || xudtCells.length === 0) {
    return sumTokenAmount;
  }

  for (const cell of xudtCells) {
    sumTokenAmount += leToU128(cell.outputData);
  }

  return sumTokenAmount;
};
