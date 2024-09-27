import { ScenarioSnapshot } from "@app/schemas";
import { StrategyService } from "../strategy.service";

export async function refreshWallets(
  strategyService: StrategyService,
  scenarioSnapshot: ScenarioSnapshot,
): Promise<void> {
  // TODO: Implement this
  console.log("refreshPool");
  console.log(strategyService);
  console.log(scenarioSnapshot);
}
