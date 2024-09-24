import { ccc } from "@ckb-ccc/core";
import { addressToScript, hexToBytes } from "@nervosnetwork/ckb-sdk-utils";
import { Logger } from "@nestjs/common";
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
  interface CustomError extends Error {
    context?: any;
  }

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
          const error = err as CustomError;
          logger.error(error.message, error.stack, error.context);
        }
        await sleep(autoIntervalMs);
      }
    })();
  }
}

export const append0x = (hex?: string): string => {
  return hex?.startsWith("0x") ? hex : `0x${hex}`;
};

export const leToU128 = (leHex: string): bigint => {
  const bytes = hexToBytes(append0x(leHex));
  const beHex = `0x${bytes.reduceRight((pre, cur) => pre + cur.toString(16).padStart(2, "0"), "")}`;
  return BigInt(beHex);
};

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

export function bigint2Hex(num: bigint): string {
  return append0x(num.toString(16));
}

export function transactionFormatter(
  transaction: ccc.Transaction,
): CKBComponents.RawTransaction {
  const {
    version,
    cellDeps,
    headerDeps,
    inputs,
    outputs,
    outputsData,
    witnesses,
  } = transaction;
  return {
    version: bigint2Hex(version),
    cellDeps: cellDeps.map((cell) => {
      return {
        outPoint: {
          txHash: cell.outPoint.txHash,
          index: bigint2Hex(cell.outPoint.index),
        },
        depType: cell.depType,
      };
    }),
    headerDeps,
    inputs: inputs.map((input) => {
      return {
        previousOutput: {
          index: bigint2Hex(input.previousOutput.index),
          txHash: input.previousOutput.txHash,
        },
        since: bigint2Hex(input.since),
      };
    }),
    outputs: outputs.map((output) => {
      return {
        capacity: bigint2Hex(output.capacity),
        lock: output.lock,
        type: output.type,
      };
    }),
    outputsData: outputsData,
    witnesses,
  };
}

export function compareWithTolerance(
  a: number,
  b: number,
  tolerancePercentage: number = 0.5,
  absoluteTolerance: number = 10 ** 8,
) {
  const difference = Math.abs(a - b);
  if (difference <= absoluteTolerance) {
    return true;
  } else {
    if (a === 0 && b === 0) {
      return true;
    } else if (a === 0 || b === 0) {
      return false;
    } else {
      return difference <= Math.abs(Math.min(a, b) * tolerancePercentage) / 100;
    }
  }
}
