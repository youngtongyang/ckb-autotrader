import { ScenarioSnapshot } from "@app/schemas";
import { StrategyService } from "../strategy.service";

export async function refreshPool(
  strategyService: StrategyService,
  scenarioSnapshot: ScenarioSnapshot,
): Promise<void> {
  // TODO: Implement this
  console.log("refreshPool");
  console.log(strategyService);
  console.log(scenarioSnapshot);
}
