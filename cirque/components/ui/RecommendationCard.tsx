import { Pressable, Text, View } from "react-native";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";
import type { AiRecommendation } from "@/types/database";

type RecommendationCardProps = {
  recommendation: AiRecommendation | null;
  onFeedback?: (helpful: boolean) => void;
  feedbackBusy?: boolean;
};

export function RecommendationCard({
  recommendation,
  onFeedback,
  feedbackBusy = false,
}: RecommendationCardProps) {
  if (!recommendation) {
    return (
      <FrostedCard>
        <Text
          className="text-sm leading-relaxed"
          style={{ color: colors.textSecondary }}
        >
          Tap “Get advice” for personalized refueling tips based on your latest
          training and what you have eaten recently.
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
      {recommendation.was_helpful == null ? (
        <View className="mt-4 flex-row gap-2">
          <Pressable
            className="flex-1 rounded-[12px] border px-3 py-2 active:opacity-90"
            style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            disabled={feedbackBusy}
            onPress={() => onFeedback?.(true)}
          >
            <Text className="text-center text-sm font-semibold" style={{ color: colors.textPrimary }}>
              Helpful
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 rounded-[12px] border px-3 py-2 active:opacity-90"
            style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            disabled={feedbackBusy}
            onPress={() => onFeedback?.(false)}
          >
            <Text className="text-center text-sm font-semibold" style={{ color: colors.textPrimary }}>
              Not helpful
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text className="mt-3 text-xs" style={{ color: colors.textSecondary }}>
          Thanks for the feedback.
        </Text>
      )}
    </FrostedCard>
  );
}
