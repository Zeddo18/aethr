import { AiFoodAssistant } from "@/components/ai-food-assistant";
import { todayStr } from "@/lib/dates";

export const metadata = { title: "AI Assistant · AETHR" };

export default function AssistantPage() {
  return <AiFoodAssistant date={todayStr()} />;
}
