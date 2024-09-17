import {
  Action,
  ActionStatus,
  ActionType,
  ScenarioSnapshot,
} from "@app/schemas";
import { ccc } from "@ckb-ccc/core";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, Collector, Pool } from "@utxoswap/swap-sdk-js";
import { CkbTxRepo } from "./repos";

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
    private readonly ckbTxRepo: CkbTxRepo,
  ) {
    const ckbRpcUrl = configService.get<string>("execute.ckb_rpc_url");
    const ckbIndexerUrl = configService.get<string>("execute.ckbIndexerUrl");
    if (ckbIndexerUrl === undefined) {
      throw Error("Empty ckbIndexerUrl");
    }
    this.CKBClient = configService.get<boolean>("is_mainnet")
      ? new ccc.ClientPublicMainnet({ url: ckbRpcUrl })
      : new ccc.ClientPublicTestnet({ url: ckbRpcUrl });
    this.collector = new Collector({ ckbIndexerUrl });
  }
  async executeActions(scenarioSnapshot: ScenarioSnapshot): Promise<boolean> {
    for (const action of scenarioSnapshot.actions) {
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
    /* If all actionStatuses are either Aborted or Stored, return true*/
    return scenarioSnapshot.actions.every(
      (action) =>
        action.actionStatus === ActionStatus.Aborted ||
        action.actionStatus === ActionStatus.Stored,
    );
  }

  /* Execution Functions
   * 1. Can be called repeatedly to try progressing the action;
   * 2. Should return the output status of the action;
   */
  private async executeTransfer(action: Action): Promise<ActionStatus> {
    //TODO: implement
    console.log(action);
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
