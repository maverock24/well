import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useLibraryStore } from '@/store/library';
import { colorForTheme } from '@/ui/colors';
import { Eyebrow, Pill } from '@/ui/components';
import type { ThemeId } from '@/types';

export default function LibraryScreen() {
  const questions = useLibraryStore((s) => s.questions);
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState<ThemeId | null>(null);

  const themes = useMemo(() => {
    const set = new Set<ThemeId>();
    for (const q of questions) for (const t of q.themes) set.add(t);
    return Array.from(set).sort();
  }, [questions]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return questions.filter((x) => {
      const matchT = !theme || x.themes.includes(theme);
      const matchQ = !q || x.text.toLowerCase().includes(q);
      return matchT && matchQ;
    });
  }, [questions, query, theme]);

  return (
    <View className="flex-1 bg-paper">
      <View className="px-5 pb-2 pt-3 gap-3">
        <View className="flex-row items-center gap-2 rounded-xl border border-rule bg-paper px-3">
          <Feather name="search" size={16} color="#7a7870" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search questions"
            placeholderTextColor="#7a7870"
            className="flex-1 py-3 text-ink"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} className="p-1">
              <Feather name="x" size={14} color="#7a7870" />
            </Pressable>
          )}
        </View>

        <FlatList
          horizontal
          data={[null, ...themes] as Array<ThemeId | null>}
          keyExtractor={(t) => t ?? 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 py-1"
          renderItem={({ item }) => (
            <Pill
              label={item ?? 'all'}
              active={theme === item}
              onPress={() => setTheme(item)}
              accent={item ? colorForTheme(item) : undefined}
            />
          )}
        />

        <View className="flex-row items-baseline justify-between pt-1">
          <Eyebrow>{filtered.length} questions</Eyebrow>
          <Link href="/question/new" className="text-xs text-ink">
            ＋ New
          </Link>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(q) => q.id}
        contentContainerClassName="px-5 pb-12"
        renderItem={({ item }) => {
          const accent = colorForTheme(item.themes[0]);
          return (
            <Link href={`/question/${item.id}`} asChild>
              <Pressable className="flex-row gap-3 border-b border-rule py-4 active:opacity-60">
                <View
                  style={{ width: 3, borderRadius: 2, backgroundColor: accent }}
                />
                <View className="flex-1">
                  <Text className="font-serif text-lg text-ink">{item.text}</Text>
                  <View className="mt-1 flex-row items-center gap-2">
                    <Text className="text-[11px] text-muted">{item.themes.join(' · ')}</Text>
                    <Text className="text-[11px] text-muted">·</Text>
                    <Text className="text-[11px] text-muted">
                      {'•'.repeat(item.intensity)}
                    </Text>
                    {item.scale && (
                      <>
                        <Text className="text-[11px] text-muted">·</Text>
                        <Text className="text-[11px] text-muted">{item.scale.axis}</Text>
                      </>
                    )}
                  </View>
                </View>
              </Pressable>
            </Link>
          );
        }}
        ListEmptyComponent={
          <Text className="mt-12 text-center text-muted">No questions match.</Text>
        }
      />
    </View>
  );
}
