import { Feather } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useHistoryStore } from '@/store/history';
import { useLibraryStore } from '@/store/library';
import { colorForTheme } from '@/ui/colors';
import { presetDominantTheme } from '@/ui/preset-theme';
import { Card, EmptyState } from '@/ui/components';

export default function SessionsScreen() {
  const sessions = useHistoryStore((s) => s.sessions);
  const presets = useLibraryStore((s) => s.presets);
  const refresh = useHistoryStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <FlatList
      data={sessions}
      keyExtractor={(s) => s.id}
      contentContainerClassName="px-5 pb-12 pt-3 gap-3"
      ListEmptyComponent={
        <EmptyState
          title="No sessions yet"
          body="Start one from the home screen. Each conversation is saved here, alongside its report."
        />
      }
      renderItem={({ item }) => {
        const preset = presets.find((p) => p.id === item.presetId);
        const accent = colorForTheme(preset && presetDominantTheme(preset));
        const answered = item.answers.filter((a) => !a.skipped).length;
        return (
          <Link href={`/session/${item.id}/summary`} asChild>
            <Pressable className="active:opacity-70">
              <Card accent={accent}>
                <View className="flex-row items-center gap-3 p-4">
                  <View className="flex-1">
                    <Text className="font-serif text-lg text-ink" numberOfLines={1}>
                      {item.title ?? preset?.name ?? item.presetId}
                    </Text>
                    <Text className="mt-1 text-[11px] text-muted">
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                    {item.participants.length > 0 && (
                      <Text className="mt-1 text-[11px] text-muted">
                        with {item.participants.join(', ')}
                      </Text>
                    )}
                  </View>
                  <View className="items-end">
                    <Text className="font-serif text-2xl text-ink">
                      {answered}
                      <Text className="text-sm text-muted">/{item.questionIds.length}</Text>
                    </Text>
                    <Feather name="chevron-right" size={16} color="#7a7870" />
                  </View>
                </View>
              </Card>
            </Pressable>
          </Link>
        );
      }}
    />
  );
}
