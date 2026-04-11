import { Text, View } from "react-native";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";
import type { AiRecommendation } from "@/types/database";

type RecommendationCardProps = {
  recommendation: AiRecommendation | null;
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  if (!recommendation) {
    return (
      <FrostedCard>
        <Text
          className="text-sm leading-relaxed"
          style={{ color: colors.textSecondary }}
        >
          Log your first workout to get personalized refueling advice.
        </Text>
      </FrostedCard>
    );
  }

  return (
    <FrostedCard leftBorderAccent={colors.accentBright}>
      <View className="relative min-h-[48px]">
        <View
          className="absolute right-0 top-0 z-10 rounded-full px-2 py-0.5"
          style={{
            backgroundColor: "rgba(13, 27, 42, 0.9)",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            className="text-[10px] font-bold uppercase tracking-wide"
            style={{ color: colors.accentBright }}
          >
            AI
          </Text>
        </View>
        <Text className="pr-12 text-base leading-relaxed text-white">
          {recommendation.recommendation}
        </Text>
      </View>
    </FrostedCard>
  );
}
