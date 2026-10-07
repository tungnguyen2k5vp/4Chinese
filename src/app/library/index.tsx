import { ToolHub } from "@/components/ToolHub";
import { libraryGroups } from "@/services/app/tool-hubs";

export default function LibraryHub() {
  return (
    <ToolHub
      title="Thư viện"
      subtitle="Đọc, lưu nội dung cá nhân và tra cứu trong kho offline."
      groups={libraryGroups}
    />
  );
}
