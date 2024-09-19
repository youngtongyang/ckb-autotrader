import {
  Action,
  ActionGroupStatus,
  ActionStatus,
  ActionType,
  ScenarioSnapshot,
} from "@app/schemas";
import { ccc } from "@ckb-ccc/core";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, Collector, Pool } from "@utxoswap/swap-sdk-js";
import { ActionRepo } from "./repos";
import { walletRegistry } from "parameters/walletRegistry.example";

@Injectable()
export class ExecuteService {
  private readonly logger = new Logger(ExecuteService.name);
  private readonly apiKey = "your api key";
  private readonly CKBClient: ccc.Client = new ccc.ClientPublicTestnet();
  private readonly UTXOSwapClient: Client = new Client(false, this.apiKey);
  private readonly collector: Collector;
  private readonly maxPendingTxs: number;
  private pools: Pool[] = [];
  private scenarioSnapshots: ScenarioSnapshot[] = [];

  constructor(
    configService: ConfigService,
    private readonly actionRepo: ActionRepo,
  ) {
    const ckbRpcUrl = configService.get<string>("common.ckb_rpc_url");
    const ckbIndexerUrl = configService.get<string>("common.ckb_indexer_url");
    if (ckbIndexerUrl === undefined) {
      throw Error("Empty ckb_indexer_url");
    }
    this.CKBClient = configService.get<boolean>("is_mainnet")
      ? new ccc.ClientPublicMainnet({ url: ckbRpcUrl })
      : new ccc.ClientPublicTestnet({ url: ckbRpcUrl });
    this.collector = new Collector({ ckbIndexerUrl });
  }

  async executeActions(scenarioSnapshot: ScenarioSnapshot): Promise<void> {
    // NOTE: This function is designed to be blocking.
    // TODO: Abort by timer;
    while (
      scenarioSnapshot.actionGroupStatus ===
      (ActionGroupStatus.Aborted || ActionGroupStatus.Completed)
    ) {
      for (const action of scenarioSnapshot.actions) {
        // TODO: This is blocking, should be refactored to be non-blocking
        let status: ActionStatus;
        switch (action.actionType) {
          case ActionType.Transfer:
            status = await this.executeTransfer(action);
            break;
          case ActionType.AddLiquidity:
            status = await this.executeAddLiquidity(action);
            break;
          case ActionType.RemoveLiquidity:
            status = await this.executeRemoveLiquidity(action);
            break;
          case ActionType.SwapExactInputForOutput:
            status = await this.executeSwapExactInputForOutput(action);
            break;
          case ActionType.SwapInputForExactOutput:
            status = await this.executeSwapInputForExactOutput(action);
            break;
          case ActionType.ClaimProtocolLiquidity:
            status = await this.executeClaimProtocolLiquidity(action);
            break;
          default:
            throw new Error("Unsupported action type");
        }
        action.actionStatus = status;
      }
      /* Return and finish if all actionStatuses are Stored or any one of them is Aborted */
      if (
        scenarioSnapshot.actions.every(
          (action) => action.actionStatus === ActionStatus.Stored,
        )
      ) {
        scenarioSnapshot.actionGroupStatus = ActionGroupStatus.Completed;
      } else if (
        scenarioSnapshot.actions.some(
          (action) => action.actionStatus === ActionStatus.Aborted,
        )
      ) {
        scenarioSnapshot.actionGroupStatus = ActionGroupStatus.Aborted;
      }
    }
    return;
  }

  /* Execution Functions
   * 1. Can be called repeatedly to try progressing the action;
   * 2. Should return the output status of the action;
   * 3. Should be able to abort;
   */
  private async executeTransfer(action: Action): Promise<ActionStatus> {
    //TODO: implement
    if (action.assetXSymbol != action.assetYSymbol) {
      throw new Error("AssetX and AssetY must be the same for transfer action");
    }
    if (action.actorAddress === action.targetAddress) {
      throw new Error(
        "Actor and target addresses must be different for transfer action",
      );
    }
    const actorWallet = walletRegistry.find(
      (wallet) => wallet.address === action.actorAddress,
    );

    return ActionStatus.Confirmed;
  }

  private async executeAddLiquidity(action: Action): Promise<ActionStatus> {
    //TODO: implement
    console.log(action);
    return ActionStatus.Confirmed;
  }

  private async executeRemoveLiquidity(action: Action): Promise<ActionStatus> {
    //TODO: implement
    console.log(action);
    return ActionStatus.Confirmed;
  }

  private async executeSwapExactInputForOutput(
    action: Action,
  ): Promise<ActionStatus> {
    // TODO: implement
    console.log(action);
    return ActionStatus.Confirmed;
  }

  private async executeSwapInputForExactOutput(
    action: Action,
  ): Promise<ActionStatus> {
    // TODO: implement
    console.log(action);
    return ActionStatus.Confirmed;
  }

  private async executeClaimProtocolLiquidity(
    action: Action,
  ): Promise<ActionStatus> {
    // TODO: implement
    console.log(action);
    return ActionStatus.Confirmed;
  }
}
