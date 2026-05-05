import { Feather } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useHistoryStore } from '@/store/history';
import { useLibraryStore } from '@/store/library';
import {
  Body,
  Card,
  Display,
  Eyebrow,
  Heading,
  Inline,
  Meta,
} from '@/ui/components';
import { colorForTheme } from '@/ui/colors';
import { presetDominantTheme } from '@/ui/preset-theme';

/**
 * Home — single primary goal: start a session.
 * Above-the-fold rhythm: brand → recent (if any) → presets grid.
 * Card titles use the small display size; the brand mark is the only
 * hero on the screen (von Restorff distinctness).
 */
export default function HomeScreen() {
  const presets = useLibraryStore((s) => s.presets);
  const sessions = useHistoryStore((s) => s.sessions);
  const refreshHistory = useHistoryStore((s) => s.refresh);
  const router = useRouter();

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const recent = sessions.slice(0, 3);

  return (
    <FlatList
      data={presets}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperClassName="gap-3 px-5"
      contentContainerClassName="pb-15 pt-2 gap-3"
      ListHeaderComponent={
        <View className="px-5 pb-3 pt-8">
          {/* Brand — sole hero */}
          <Display size="2xl">well.</Display>
          <View className="mt-2">
            <Body muted>Better questions, kept close.</Body>
          </View>

          {recent.length > 0 && (
            <View className="mt-13">
              <Inline align="end" className="justify-between">
                <Eyebrow>Recent</Eyebrow>
                <Link
                  href="/sessions"
                  accessibilityRole="link"
                  className="font-sans text-meta text-muted"
                >
                  See all
                </Link>
              </Inline>
              <View className="mt-3 gap-2">
                {recent.map((s) => {
                  const preset = presets.find((p) => p.id === s.presetId);
                  const accent = colorForTheme(preset && presetDominantTheme(preset));
                  const answered = s.answers.filter((a) => !a.skipped).length;
                  return (
                    <Link key={s.id} href={`/session/${s.id}/summary`} asChild>
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`${s.title ?? preset?.name ?? 'Session'}, ${answered} of ${s.questionIds.length} answered`}
                        style={{ minHeight: 60 }}
                        className="flex-row items-center gap-3 rounded-md border border-rule bg-paper px-3 active:opacity-70"
                      >
                        <View
                          style={{
                            width: 3,
                            height: 36,
                            borderRadius: 2,
                            backgroundColor: accent,
                          }}
                        />
                        <View className="flex-1">
                          <Heading size="sm" className="text-ink">
                            {s.title ?? preset?.name ?? s.presetId}
                          </Heading>
                          <View className="mt-0.5">
                            <Meta className="tabular-nums">
                              {new Date(s.createdAt).toLocaleDateString()} · {answered}/
                              {s.questionIds.length} answered
                            </Meta>
                          </View>
                        </View>
                        <Feather name="chevron-right" size={18} color="rgb(110,104,96)" />
                      </Pressable>
                    </Link>
                  );
                })}
              </View>
            </View>
          )}

          <View className="mt-13">
            <Inline align="end" className="justify-between">
              <Eyebrow>Presets</Eyebrow>
              <Link
                href="/preset/new"
                accessibilityRole="link"
                className="font-sans text-body-sm font-semibold text-ink"
              >
                + New
              </Link>
            </Inline>
          </View>
        </View>
      }
      renderItem={({ item }) => {
        const accent = colorForTheme(presetDominantTheme(item));
        return (
          <Card className="flex-1" accent={accent}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Start ${item.name}`}
              style={{ minHeight: 44 }}
              className="p-4 active:opacity-70"
              onPress={() =>
                router.push({
                  pathname: '/session/new',
                  params: { presetId: item.id },
                })
              }
            >
              <Heading size="sm">{item.name}</Heading>
              <View className="mt-2">
                <Body size="sm" muted numberOfLines={3}>
                  {item.description}
                </Body>
              </View>
              <Inline gap={1.5} className="mt-4">
                <View className="rounded-full bg-paper-2 px-2 py-0.5">
                  <Meta className="tabular-nums">{item.defaultLength} q</Meta>
                </View>
                <View className="rounded-full bg-paper-2 px-2 py-0.5">
                  <Meta className="tabular-nums">
                    {item.intensityRange[0]}–{item.intensityRange[1]}
                  </Meta>
                </View>
              </Inline>
            </Pressable>
            <Link href={`/preset/${item.id}/edit`} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Edit ${item.name}`}
                style={{ minHeight: 36 }}
                className="flex-row items-center justify-between border-t border-rule px-4 active:opacity-70"
              >
                <Eyebrow>Edit</Eyebrow>
                <Feather name="edit-2" size={12} color="rgb(110,104,96)" />
              </Pressable>
            </Link>
          </Card>
        );
      }}
    />
  );
}
