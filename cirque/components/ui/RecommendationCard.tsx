import { Text, View } from "react-native";

import type { AiRecommendation } from "@/types/database";

type RecommendationCardProps = {
  recommendation: AiRecommendation | null;
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  if (!recommendation) {
    return (
      <View
        className="rounded-xl bg-[#1a1a1a] px-4 py-4"
        style={{ borderRadius: 12 }}
      >
        <Text className="text-sm leading-relaxed text-[#888888]">
          Log your first workout to get personalized refueling advice.
        </Text>
      </View>
    );
  }

  return (
    <View
      className="relative rounded-xl border border-[#00D4A0]/40 bg-[#1a1a1a] px-4 py-4"
      style={{ borderRadius: 12 }}
    >
      <View className="absolute right-3 top-3 rounded bg-[#00D4A0]/20 px-2 py-0.5">
        <Text className="text-[10px] font-bold uppercase text-[#00D4A0]">
          AI
        </Text>
      </View>
      <Text className="pr-12 text-base leading-relaxed text-white">
        {recommendation.recommendation}
      </Text>
    </View>
  );
}
