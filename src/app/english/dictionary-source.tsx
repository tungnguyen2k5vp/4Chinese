import { Linking, Text } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SKYPEDIA_REPOSITORY, SKYPEDIA_VERSION } from "@/db/english/skypedia";
import { useTheme } from "@/theme/ThemeProvider";

export default function DictionarySource() {
  const theme = useTheme();
  const textStyle = {
    color: theme.textPrimary,
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 16,
  };
  return (
    <Screen
      title="Nguồn từ điển Anh–Việt"
      subtitle="Skypedia · dữ liệu chính cho nhận diện từ cá nhân"
    >
      <Text style={textStyle}>
        Từ điển SQLite của Skypedia được xây dựng từ MinhQND Dictionary, với
        nguồn tham khảo Wiktionary, vntk/dictionary, Hồ Ngọc Đức, WikDict và
        OVDP.
      </Text>
      <Text style={textStyle}>
        Tác giả công bố giấy phép CC BY-SA 4.0 cho cơ sở dữ liệu. Tệp tải trực
        tiếp từ phiên bản {SKYPEDIA_VERSION.slice(0, 7)} của kho nguồn và lưu
        riêng trên thiết bị để dùng offline.
      </Text>
      <Text style={textStyle}>
        Ví dụ do tác giả nguồn tạo và chuẩn hóa. Một phần IPA được nguồn bổ sung
        bằng xử lý tự động. Nghĩa và phiên âm là gợi ý từ nguồn; hãy kiểm tra và
        chọn nghĩa phù hợp trước khi lưu.
      </Text>
      <Text style={textStyle}>
        4Chinese giữ nguyên tệp nguồn. Nội dung bạn sửa được ghi nhận là từ cá
        nhân. Giọng US/UK là chuyển văn bản thành giọng nói của thiết bị, không
        phải bản ghi âm của từ điển.
      </Text>
      <PrimaryButton
        label="Mở kho từ điển Skypedia"
        onPress={() => void Linking.openURL(SKYPEDIA_REPOSITORY)}
      />
      <PrimaryButton
        label="Xem ghi công đầy đủ của nguồn"
        variant="secondary"
        onPress={() =>
          void Linking.openURL(
            `${SKYPEDIA_REPOSITORY}/blob/${SKYPEDIA_VERSION}/ATTRIBUTION.md`,
          )
        }
      />
      <PrimaryButton
        label="Xem giấy phép của nguồn"
        variant="secondary"
        onPress={() =>
          void Linking.openURL(
            `${SKYPEDIA_REPOSITORY}/blob/${SKYPEDIA_VERSION}/LICENSE`,
          )
        }
      />
    </Screen>
  );
}
