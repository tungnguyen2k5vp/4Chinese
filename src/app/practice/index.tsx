import { ToolHub } from "@/components/ToolHub";
import { practiceGroups } from "@/services/app/tool-hubs";

export default function PracticeHub() {
  return (
    <ToolHub
      title="Luyện tập"
      subtitle="Chọn kỹ năng cần luyện. Các công cụ và tiến độ cũ được giữ nguyên."
      groups={practiceGroups}
      scene="practice"
    />
  );
}
