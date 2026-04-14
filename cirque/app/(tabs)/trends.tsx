import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import {
  addCalendarDays,
  formatDashboardDayLabel,
  getTodayDateString,
} from "@/lib/formatters";
import { getRollingDayTotals, type DayTotalsRow } from "@/lib/trends";

const RANGE_DAYS = 7;

function maxCalories(rows: DayTotalsRow[]): number {
  let m = 1;
  for (const r of rows) {
    const c = r.totals.calories;
    if (c > m) {
      m = c;
    }
  }
  return m;
}

export default function TrendsTab() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const userId = profile?.id;
  const [rows, setRows] = useState<DayTotalsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [endDate, setEndDate] = useState(getTodayDateString);
  const todayStr = getTodayDateString();

  const load = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getRollingDayTotals(userId, endDate, RANGE_DAYS);
      setRows(data);
    } catch (e) {
      console.error("[Trends]", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId, endDate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const peak = maxCalories(rows);
  const startLabel =
    rows.length > 0 ? formatDashboardDayLabel(rows[0].date) : "";
  const endLabel =
    rows.length > 0 ? formatDashboardDayLabel(rows[rows.length - 1].date) : "";

  return (
    <View
      className="flex-1 bg-brand-bg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="px-4 pb-3 pt-2">
        <Text className="text-2xl font-bold text-white">Trends</Text>
        <Text className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          {RANGE_DAYS}-day calories (from food logs)
        </Text>
        <View className="mt-4 flex-row items-center justify-between rounded-xl border px-2 py-2" style={{ borderColor: colors.border }}>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-lg active:opacity-80"
            style={{ backgroundColor: colors.surface }}
            onPress={() => setEndDate((d) => addCalendarDays(d, -7))}
            accessibilityRole="button"
            accessibilityLabel="Previous week"
          >
            <Text className="text-lg text-white">‹</Text>
          </Pressable>
          <Text className="text-center text-xs font-semibold text-white" numberOfLines={2}>
            {startLabel && endLabel ? `${startLabel} – ${endLabel}` : "—"}
          </Text>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-lg active:opacity-80"
            style={{ backgroundColor: colors.surface }}
            disabled={endDate >= todayStr}
            onPress={() => setEndDate((d) => addCalendarDays(d, 7))}
            accessibilityRole="button"
            accessibilityLabel="Next week"
          >
            <Text
              className="text-lg"
              style={{
                color: endDate >= todayStr ? colors.textTertiary : colors.textPrimary,
              }}
            >
              ›
            </Text>
          </Pressable>
        </View>
      </View>

      {loading && rows.length === 0 ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator color={colors.accentBright} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={colors.accentBright}
            />
          }
        >
          <FrostedCard className="mb-4">
            <Text
              className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: colors.textTertiary }}
            >
              Daily calories
            </Text>
            <View className="gap-3">
              {rows.map((r) => {
                const kcal = Math.round(r.totals.calories);
                const h = peak > 0 ? Math.min(100, (r.totals.calories / peak) * 100) : 0;
                return (
                  <View key={r.date}>
                    <View className="mb-1 flex-row justify-between">
                      <Text className="text-sm text-white">{formatDashboardDayLabel(r.date)}</Text>
                      <Text className="text-sm font-semibold" style={{ color: colors.accentBright }}>
                        {kcal} kcal
                      </Text>
                    </View>
                    <View
                      className="h-2 overflow-hidden rounded-full"
                      style={{ backgroundColor: colors.border }}
                    >
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${h}%`,
                          backgroundColor: colors.accentBright,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </FrostedCard>

          <FrostedCard>
            <Text
              className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: colors.textTertiary }}
            >
              Period totals
            </Text>
            <Text className="text-sm text-white">
              Protein{" "}
              <Text style={{ color: colors.accentBright }}>
                {Math.round(rows.reduce((s, r) => s + r.totals.protein_g, 0))} g
              </Text>
            </Text>
            <Text className="mt-1 text-sm text-white">
              Carbs{" "}
              <Text style={{ color: colors.accentBright }}>
                {Math.round(rows.reduce((s, r) => s + r.totals.carbs_g, 0))} g
              </Text>
            </Text>
            <Text className="mt-1 text-sm text-white">
              Fat{" "}
              <Text style={{ color: colors.accentBright }}>
                {Math.round(rows.reduce((s, r) => s + r.totals.fat_g, 0))} g
              </Text>
            </Text>
          </FrostedCard>
        </ScrollView>
      )}
    </View>
  );
}
