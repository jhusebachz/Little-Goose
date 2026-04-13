import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const STORAGE_KEYS = {
  openAiKey: "little-goose-openai-key",
  openAiModel: "little-goose-openai-model",
  ebayAppId: "little-goose-ebay-app-id",
  ebayGlobalId: "little-goose-ebay-global-id",
  themeMode: "little-goose-theme-mode",
};

const themes = {
  dark: {
    gradient: ["#0c1117", "#121a24", "#1d2530"],
    heroCard: "#17202b",
    panel: "#1b2633",
    surface: "#233140",
    surfaceAlt: "#101821",
    text: "#f4ede5",
    textMuted: "#aeb8c5",
    accent: "#f09a4a",
    accentStrong: "#db7135",
    accentSoft: "#3a2b21",
    positiveSoft: "#203628",
    positiveText: "#9cc8a1",
    chip: "#223041",
    chipAccent: "#39291f",
    field: "#101821",
    border: "#314255",
    errorBg: "#45202a",
    errorText: "#ffccd7",
    settingsButton: "#223041",
    settingsText: "#f3e9dc",
    conditionActive: "#6a9a65",
    conditionInactive: "#243241",
    conditionInactiveText: "#d3dbe5",
  },
  light: {
    gradient: ["#f8f0e5", "#efdfc8", "#ead7be"],
    heroCard: "#fff8ef",
    panel: "#fffaf3",
    surface: "#f8ebdb",
    surfaceAlt: "#f3e3cf",
    text: "#241915",
    textMuted: "#65554a",
    accent: "#f0b05a",
    accentStrong: "#bd6136",
    accentSoft: "#f5e5d1",
    positiveSoft: "#e7f0e2",
    positiveText: "#436142",
    chip: "rgba(255,255,255,0.75)",
    chipAccent: "rgba(240,176,90,0.22)",
    field: "#fffaf3",
    border: "#ead9c5",
    errorBg: "#fdeaf0",
    errorText: "#8c2941",
    settingsButton: "#fff7ee",
    settingsText: "#624232",
    conditionActive: "#5c8259",
    conditionInactive: "#fff6ec",
    conditionInactiveText: "#6f5b4c",
  },
};

const conditionOptions = [
  { value: "unknown", label: "Condition unknown" },
  { value: "new-open-box", label: "New / open box" },
  { value: "used-great", label: "Used - great" },
  { value: "used-fair", label: "Used - fair" },
  { value: "for-parts", label: "For parts" },
];

export default function App() {
  const [itemName, setItemName] = useState("");
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState("unknown");
  const [selectedImage, setSelectedImage] = useState(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({
    openAiKey: "",
    openAiModel: "gpt-4.1-mini",
    ebayAppId: "",
    ebayGlobalId: "EBAY-US",
    themeMode: "dark",
  });
  const [credentials, setCredentials] = useState({
    openAiKey: "",
    openAiModel: "gpt-4.1-mini",
    ebayAppId: "",
    ebayGlobalId: "EBAY-US",
    themeMode: "dark",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const readyText = useMemo(() => {
    if (booting) return "Loading your setup...";
    if (credentials.openAiKey && credentials.ebayAppId) return "Photo ID and live comps are ready.";
    if (credentials.openAiKey) return "Photo ID is ready. Add eBay for live comp math.";
    if (credentials.ebayAppId) return "Live comps are ready. Add OpenAI for photo ID.";
    return "Add your API keys in Settings to unlock the full flow.";
  }, [booting, credentials]);

  const theme = themes[credentials.themeMode] || themes.dark;

  async function loadSettings() {
    try {
      const values = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.openAiKey),
        SecureStore.getItemAsync(STORAGE_KEYS.openAiModel),
        SecureStore.getItemAsync(STORAGE_KEYS.ebayAppId),
        SecureStore.getItemAsync(STORAGE_KEYS.ebayGlobalId),
        SecureStore.getItemAsync(STORAGE_KEYS.themeMode),
      ]);

      const next = {
        openAiKey: values[0] || "",
        openAiModel: values[1] || "gpt-4.1-mini",
        ebayAppId: values[2] || "",
        ebayGlobalId: values[3] || "EBAY-US",
        themeMode: values[4] || "dark",
      };

      setCredentials(next);
      setSettingsDraft(next);
    } finally {
      setBooting(false);
    }
  }

  async function saveSettings() {
    const next = {
      openAiKey: settingsDraft.openAiKey.trim(),
      openAiModel: settingsDraft.openAiModel.trim() || "gpt-4.1-mini",
      ebayAppId: settingsDraft.ebayAppId.trim(),
      ebayGlobalId: settingsDraft.ebayGlobalId.trim() || "EBAY-US",
      themeMode: settingsDraft.themeMode === "light" ? "light" : "dark",
    };

    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.openAiKey, next.openAiKey),
      SecureStore.setItemAsync(STORAGE_KEYS.openAiModel, next.openAiModel),
      SecureStore.setItemAsync(STORAGE_KEYS.ebayAppId, next.ebayAppId),
      SecureStore.setItemAsync(STORAGE_KEYS.ebayGlobalId, next.ebayGlobalId),
      SecureStore.setItemAsync(STORAGE_KEYS.themeMode, next.themeMode),
    ]);

    setCredentials(next);
    setSettingsVisible(false);
  }

  async function pickImage(source) {
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Little Goose needs permission before it can grab a photo.");
        return;
      }

      const picker =
        source === "camera"
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync;

      const resultImage = await picker({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
        base64: false,
      });

      if (!resultImage.canceled && resultImage.assets?.[0]) {
        setSelectedImage(resultImage.assets[0]);
      }
    } catch (pickError) {
      Alert.alert("Photo problem", pickError.message || "Little Goose could not open that image.");
    }
  }

  async function appraiseItem() {
    if (!selectedImage && !itemName.trim()) {
      setError("Take a photo or enter an item title first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const identification = await identifyItem({
        imageUri: selectedImage?.uri,
        itemName,
        notes,
        condition,
        openAiKey: credentials.openAiKey,
        openAiModel: credentials.openAiModel,
      });

      const ebayData = await fetchEbayComps(
        identification.searchQuery,
        credentials.ebayAppId,
        credentials.ebayGlobalId,
      );
      const stats = buildPriceStats(ebayData.soldComps, ebayData.activeComps);

      setResult({
        identification,
        stats,
        soldComps: ebayData.soldComps.slice(0, 6),
        activeComps: ebayData.activeComps.slice(0, 6),
        sourceUrls: ebayData.sourceUrls,
        guidance: buildGuidance({
          identification,
          stats,
          pricingConfigured: Boolean(credentials.ebayAppId),
          soldCount: ebayData.soldComps.length,
          activeCount: ebayData.activeComps.length,
        }),
      });
    } catch (appraiseError) {
      setError(appraiseError.message || "Little Goose hit a snag while pricing that item.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={theme.gradient} style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <StatusBar style={credentials.themeMode === "dark" ? "light" : "dark"} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroCard, { backgroundColor: theme.heroCard }]}>
            <View style={styles.heroTopRow}>
              <Text style={[styles.eyebrow, { color: theme.accent }]}>Little Goose</Text>
              <Pressable style={[styles.settingsButton, { backgroundColor: theme.settingsButton }]} onPress={() => setSettingsVisible(true)}>
                <Text style={[styles.settingsButtonText, { color: theme.settingsText }]}>Settings</Text>
              </Pressable>
            </View>
            <Text style={[styles.heroTitle, { color: theme.text }]}>Snap thrift finds and sanity-check resale pricing.</Text>
            <Text style={[styles.heroText, { color: theme.textMuted }]}>
              Use your camera in the aisle, add a quick title if needed, and compare sold plus active
              comps before you buy.
            </Text>
            <View style={styles.chipsRow}>
              <Chip label={readyText} accent theme={theme} />
              <Chip label="Android via Expo" theme={theme} />
              <Chip label="eBay sold + active comps" theme={theme} />
            </View>
          </View>

          <View style={[styles.panel, { backgroundColor: theme.panel }]}>
            <Text style={[styles.panelTitle, { color: theme.text }]}>Price a find</Text>
            <Text style={[styles.panelText, { color: theme.textMuted }]}>Photos work best when the label or model number is visible.</Text>
            <View style={styles.photoActions}>
              <ActionButton label="Take photo" onPress={() => pickImage("camera")} theme={theme} />
              <ActionButton label="Choose from library" onPress={() => pickImage("library")} secondary theme={theme} />
            </View>

            {selectedImage ? (
              <Image source={{ uri: selectedImage.uri }} style={styles.preview} />
            ) : (
              <View style={[styles.previewPlaceholder, { backgroundColor: theme.surfaceAlt }]}>
                <Text style={[styles.previewPlaceholderText, { color: theme.textMuted }]}>Your photo preview will show up here.</Text>
              </View>
            )}

            <LabeledField label="Item title" theme={theme}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.field, color: theme.text, borderColor: theme.border }]}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Sony Walkman WM-FX195"
                placeholderTextColor={theme.textMuted}
              />
            </LabeledField>

            <LabeledField label="Condition" theme={theme}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.conditionRow}>
                {conditionOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.conditionChip,
                      {
                        backgroundColor:
                          condition === option.value ? theme.conditionActive : theme.conditionInactive,
                      },
                    ]}
                    onPress={() => setCondition(option.value)}
                  >
                    <Text
                      style={[
                        styles.conditionChipText,
                        {
                          color:
                            condition === option.value ? "#f8f1e7" : theme.conditionInactiveText,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </LabeledField>

            <LabeledField label="Notes" theme={theme}>
              <TextInput
                style={[styles.input, styles.notesInput, { backgroundColor: theme.field, color: theme.text, borderColor: theme.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Brand, material, flaws, or model number"
                placeholderTextColor={theme.textMuted}
                multiline
                textAlignVertical="top"
              />
            </LabeledField>

            <Pressable style={[styles.primaryButton, { backgroundColor: theme.accentStrong }]} onPress={appraiseItem} disabled={loading || booting}>
              {loading ? <ActivityIndicator color="#fffaf1" /> : <Text style={styles.primaryButtonText}>Find pricing</Text>}
            </Pressable>

            {error ? <Text style={[styles.errorText, { color: theme.errorText, backgroundColor: theme.errorBg }]}>{error}</Text> : null}
          </View>

          <View style={[styles.panel, { backgroundColor: theme.panel }]}>
            <Text style={[styles.panelTitle, { color: theme.text }]}>What Little Goose found</Text>
            <Text style={[styles.panelText, { color: theme.textMuted }]}>Sold comps are strongest. Active listings help when sold data is thin.</Text>

            {result ? (
              <ResultsCard result={result} theme={theme} />
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing priced yet.</Text>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>Add your keys in Settings, snap a photo, and Little Goose will do the rest.</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <SettingsModal
          visible={settingsVisible}
          value={settingsDraft}
          onChange={setSettingsDraft}
          onClose={() => setSettingsVisible(false)}
          onSave={saveSettings}
          theme={theme}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

function ResultsCard({ result, theme }) {
  return (
    <View style={styles.resultStack}>
      <View style={[styles.summaryCard, { backgroundColor: theme.surfaceAlt }]}>
        <Text style={[styles.resultLabel, { color: theme.accent }]}>Identified item</Text>
        <Text style={[styles.resultTitle, { color: theme.text }]}>{result.identification.productName}</Text>
        <Text style={[styles.resultSubtext, { color: theme.textMuted }]}>Confidence {Math.round((result.identification.confidence || 0) * 100)}%</Text>
        <View style={styles.summaryGrid}>
          <SummaryBox label="Search query" value={result.identification.searchQuery} theme={theme} />
          <SummaryBox label="Condition" value={result.identification.conditionEstimate} theme={theme} />
          <SummaryBox label="Category" value={result.identification.category || "Not specified"} theme={theme} />
          <SummaryBox label="Brand / model" value={buildBrandModel(result.identification)} theme={theme} />
        </View>
        <View style={[styles.priceBand, { backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.resultLabel, { color: theme.accent }]}>Likely price band</Text>
          <Text style={[styles.priceBandValue, { color: theme.text }]}>
            {result.stats ? `${formatMoney(result.stats.low)} - ${formatMoney(result.stats.high)}` : "Not enough data yet"}
          </Text>
          <Text style={[styles.resultSubtext, { color: theme.textMuted }]}>
            {result.stats
              ? `Median ${formatMoney(result.stats.median)} from ${result.stats.sampleSize} ${result.stats.basis} comp${result.stats.sampleSize === 1 ? "" : "s"}`
              : "Add your eBay app ID or tighten the title to improve the match."}
          </Text>
        </View>
        {result.guidance.map((line) => (
          <Text key={line} style={[styles.guidanceLine, { color: theme.textMuted }]}>• {line}</Text>
        ))}
        <View style={styles.linkRow}>
          <Pressable style={[styles.linkButton, { backgroundColor: theme.positiveSoft }]} onPress={() => Linking.openURL(result.sourceUrls.sold)}>
            <Text style={[styles.linkButtonText, { color: theme.positiveText }]}>Open sold search</Text>
          </Pressable>
          <Pressable style={[styles.linkButton, { backgroundColor: theme.positiveSoft }]} onPress={() => Linking.openURL(result.sourceUrls.active)}>
            <Text style={[styles.linkButtonText, { color: theme.positiveText }]}>Open active search</Text>
          </Pressable>
        </View>
      </View>
      <CompSection title="Sold comps" items={result.soldComps} theme={theme} />
      <CompSection title="Active listings" items={result.activeComps} theme={theme} />
    </View>
  );
}

function CompSection({ title, items, theme }) {
  return (
    <View style={styles.compSection}>
      <Text style={[styles.compSectionTitle, { color: theme.text }]}>{title}</Text>
      {items.length
        ? items.map((item) => (
            <Pressable key={item.url} style={[styles.compCard, { backgroundColor: theme.surfaceAlt }]} onPress={() => Linking.openURL(item.url)}>
              {item.image ? <Image source={{ uri: item.image }} style={styles.compImage} /> : <View style={[styles.compImageFallback, { backgroundColor: theme.surface }]} />}
              <View style={styles.compCopy}>
                <Text style={[styles.compTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.compMeta, { color: theme.textMuted }]}>{item.condition || "Condition not listed"}</Text>
                <Text style={[styles.compPrice, { color: theme.positiveText }]}>
                  {formatMoney(item.price)} {item.shipping > 0 ? `+ ${formatMoney(item.shipping)} ship` : "• free ship"}
                </Text>
              </View>
            </Pressable>
          ))
        : <Text style={[styles.emptyText, { color: theme.textMuted }]}>No clean comps captured yet.</Text>}
    </View>
  );
}

function SettingsModal({ visible, value, onChange, onClose, onSave, theme }) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={[styles.modalScreen, { backgroundColor: theme.gradient[1] }]}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Settings</Text>
          <Text style={[styles.modalText, { color: theme.textMuted }]}>
            Your keys are stored only on this device with SecureStore. OpenAI powers photo identification. eBay powers live comps.
          </Text>
          <LabeledField label="Theme" theme={theme}>
            <View style={styles.themeRow}>
              <Pressable
                style={[styles.themeButton, { backgroundColor: value.themeMode === "dark" ? theme.accentStrong : theme.conditionInactive }]}
                onPress={() => onChange((current) => ({ ...current, themeMode: "dark" }))}
              >
                <Text style={[styles.themeButtonText, { color: value.themeMode === "dark" ? "#fffaf1" : theme.conditionInactiveText }]}>Dark</Text>
              </Pressable>
              <Pressable
                style={[styles.themeButton, { backgroundColor: value.themeMode === "light" ? theme.accentStrong : theme.conditionInactive }]}
                onPress={() => onChange((current) => ({ ...current, themeMode: "light" }))}
              >
                <Text style={[styles.themeButtonText, { color: value.themeMode === "light" ? "#fffaf1" : theme.conditionInactiveText }]}>Light</Text>
              </Pressable>
            </View>
          </LabeledField>
          <LabeledField label="OpenAI API key" theme={theme}>
            <TextInput style={[styles.input, { backgroundColor: theme.field, color: theme.text, borderColor: theme.border }]} value={value.openAiKey} onChangeText={(text) => onChange((current) => ({ ...current, openAiKey: text }))} placeholder="sk-..." placeholderTextColor={theme.textMuted} autoCapitalize="none" autoCorrect={false} />
          </LabeledField>
          <LabeledField label="OpenAI model" theme={theme}>
            <TextInput style={[styles.input, { backgroundColor: theme.field, color: theme.text, borderColor: theme.border }]} value={value.openAiModel} onChangeText={(text) => onChange((current) => ({ ...current, openAiModel: text }))} placeholder="gpt-4.1-mini" placeholderTextColor={theme.textMuted} autoCapitalize="none" autoCorrect={false} />
          </LabeledField>
          <LabeledField label="eBay App ID" theme={theme}>
            <TextInput style={[styles.input, { backgroundColor: theme.field, color: theme.text, borderColor: theme.border }]} value={value.ebayAppId} onChangeText={(text) => onChange((current) => ({ ...current, ebayAppId: text }))} placeholder="Your eBay App ID" placeholderTextColor={theme.textMuted} autoCapitalize="none" autoCorrect={false} />
          </LabeledField>
          <LabeledField label="eBay global ID" theme={theme}>
            <TextInput style={[styles.input, { backgroundColor: theme.field, color: theme.text, borderColor: theme.border }]} value={value.ebayGlobalId} onChangeText={(text) => onChange((current) => ({ ...current, ebayGlobalId: text }))} placeholder="EBAY-US" placeholderTextColor={theme.textMuted} autoCapitalize="characters" autoCorrect={false} />
          </LabeledField>
          <View style={styles.modalButtons}>
            <ActionButton label="Close" onPress={onClose} secondary theme={theme} />
            <ActionButton label="Save settings" onPress={onSave} theme={theme} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function LabeledField({ label, children, theme }) {
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>{children}</View>;
}

function Chip({ label, accent = false, theme }) {
  return <View style={[styles.chip, { backgroundColor: accent ? theme.chipAccent : theme.chip }]}><Text style={[styles.chipText, { color: accent ? theme.accent : theme.textMuted }]}>{label}</Text></View>;
}

function ActionButton({ label, onPress, secondary = false, theme }) {
  return (
    <Pressable
      style={[styles.actionButton, { backgroundColor: secondary ? theme.conditionInactive : theme.accentStrong }]}
      onPress={onPress}
    >
      <Text style={[styles.actionButtonText, { color: secondary ? theme.conditionInactiveText : "#fffaf1" }]}>{label}</Text>
    </Pressable>
  );
}

function SummaryBox({ label, value, theme }) {
  return <View style={[styles.summaryBox, { backgroundColor: theme.surface }]}><Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{label}</Text><Text style={[styles.summaryValue, { color: theme.text }]}>{value}</Text></View>;
}

async function identifyItem({ imageUri, itemName, notes, condition, openAiKey, openAiModel }) {
  if (!imageUri || !openAiKey) {
    return createManualIdentification({ itemName, notes, condition });
  }

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiModel || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You help thrift-store shoppers identify items for resale pricing. " +
                "Return JSON only with these keys: productName, brand, category, model, " +
                "conditionEstimate, searchQuery, confidence, pricingNotes. " +
                "Keep searchQuery concise and suitable for eBay sold-listing searches. " +
                "If you are unsure, stay broad and say so in pricingNotes.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `User title hint: ${itemName || "none"}\n` +
                `Observed condition: ${condition}\n` +
                `User notes: ${notes || "none"}\n` +
                "Focus on the exact thing that would help a reseller search sold comps.",
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64}`,
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI could not identify that image.");
  }

  const rawJson = stripCodeFences(cleanText(data.output_text));
  let parsed;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("OpenAI identified the image, but the result format was malformed.");
  }

  return sanitizeIdentification(parsed, { itemName, notes, condition });
}

async function fetchEbayComps(searchQuery, ebayAppId, ebayGlobalId) {
  const sourceUrls = {
    sold: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&LH_Complete=1&LH_Sold=1&rt=nc`,
    active: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&LH_BIN=1&rt=nc`,
  };

  if (!ebayAppId) {
    return { soldComps: [], activeComps: [], sourceUrls };
  }

  const [soldComps, activeComps] = await Promise.all([
    callFindingApi("findCompletedItems", searchQuery, {
      ebayAppId,
      ebayGlobalId,
      soldOnly: true,
      sortOrder: "EndTimeSoonest",
    }),
    callFindingApi("findItemsAdvanced", searchQuery, {
      ebayAppId,
      ebayGlobalId,
      sortOrder: "PricePlusShippingLowest",
    }),
  ]);

  return { soldComps, activeComps, sourceUrls };
}

async function callFindingApi(operationName, searchQuery, { ebayAppId, ebayGlobalId, soldOnly = false, sortOrder }) {
  const url = new URL("https://svcs.ebay.com/services/search/FindingService/v1");
  url.searchParams.set("OPERATION-NAME", operationName);
  url.searchParams.set("SERVICE-VERSION", "1.13.0");
  url.searchParams.set("SECURITY-APPNAME", ebayAppId);
  url.searchParams.set("RESPONSE-DATA-FORMAT", "JSON");
  url.searchParams.set("REST-PAYLOAD", "");
  url.searchParams.set("GLOBAL-ID", ebayGlobalId || "EBAY-US");
  url.searchParams.set("keywords", searchQuery);
  url.searchParams.set("paginationInput.entriesPerPage", "12");

  if (sortOrder) {
    url.searchParams.set("sortOrder", sortOrder);
  }

  if (soldOnly) {
    url.searchParams.set("itemFilter(0).name", "SoldItemsOnly");
    url.searchParams.set("itemFilter(0).value", "true");
  }

  const response = await fetch(url.toString(), {
    headers: {
      "X-EBAY-SOA-OPERATION-NAME": operationName,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.errorMessage?.[0]?.error?.[0]?.message?.[0] || "eBay pricing lookup failed.");
  }

  const root = data?.[`${operationName}Response`]?.[0];
  const ack = root?.ack?.[0];

  if (ack !== "Success" && ack !== "Warning") {
    const message = root?.errorMessage?.[0]?.error?.[0]?.message?.[0];
    throw new Error(message || "eBay pricing lookup failed.");
  }

  return (root?.searchResult?.[0]?.item || []).map(mapFindingItem).filter(Boolean).slice(0, 12);
}

function mapFindingItem(item) {
  const price = extractNumericValue(item?.sellingStatus?.[0]?.convertedCurrentPrice?.[0]?.__value__);
  const shipping = extractNumericValue(item?.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__) || 0;
  const title = cleanText(item?.title?.[0]);
  const url = cleanText(item?.viewItemURL?.[0]);

  if (!title || !url || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  return {
    title,
    url,
    image: cleanText(item?.galleryURL?.[0]),
    condition:
      cleanText(item?.condition?.[0]?.conditionDisplayName?.[0]) ||
      cleanText(item?.conditionDisplayName?.[0]),
    price: roundMoney(price),
    shipping: roundMoney(shipping),
    totalPrice: roundMoney(price + shipping),
  };
}

function createManualIdentification({ itemName, notes, condition }) {
  return sanitizeIdentification(
    {
      productName: itemName || "Manual lookup",
      brand: "",
      category: "",
      model: "",
      conditionEstimate: humanizeCondition(condition),
      searchQuery: buildManualSearchQuery(itemName, condition),
      confidence: itemName ? 0.62 : 0.28,
      pricingNotes: [
        "Using your manual title instead of image recognition.",
        notes ? `Notes saved: ${notes}` : "Add a brand or model number to tighten the comps.",
      ],
    },
    { itemName, notes, condition },
  );
}

function sanitizeIdentification(raw, fallback) {
  const productName = cleanText(raw?.productName) || cleanText(fallback.itemName) || "Unidentified item";
  const brand = cleanText(raw?.brand);
  const category = cleanText(raw?.category);
  const model = cleanText(raw?.model);
  const conditionEstimate = cleanText(raw?.conditionEstimate) || humanizeCondition(fallback.condition);
  const searchQuery =
    cleanText(raw?.searchQuery) ||
    buildManualSearchQuery([brand, productName, model].filter(Boolean).join(" "), fallback.condition);
  const confidence = clampNumber(raw?.confidence, 0.05, 0.99, fallback.itemName ? 0.6 : 0.42);
  const pricingNotes = Array.isArray(raw?.pricingNotes)
    ? raw.pricingNotes.map(cleanText).filter(Boolean).slice(0, 3)
    : [];

  return {
    productName,
    brand,
    category,
    model,
    conditionEstimate,
    searchQuery,
    confidence,
    pricingNotes:
      pricingNotes.length > 0
        ? pricingNotes
        : [
            fallback.notes
              ? `Manual note: ${fallback.notes}`
              : "If the comps look off, add the brand or model number and try again.",
          ],
  };
}

function buildPriceStats(soldComps, activeComps) {
  const soldValues = cleanPriceSeries(soldComps.map((item) => item.totalPrice || item.price));
  const activeValues = cleanPriceSeries(activeComps.map((item) => item.totalPrice || item.price));
  const basis = soldValues.length >= 3 ? "sold" : activeValues.length >= 3 ? "active" : null;
  const values = basis === "sold" ? soldValues : activeValues;

  if (!basis || values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  return {
    basis,
    sampleSize: sorted.length,
    low: percentile(sorted, 0.25),
    median: percentile(sorted, 0.5),
    high: percentile(sorted, 0.75),
  };
}

function buildGuidance({ identification, stats, pricingConfigured, soldCount, activeCount }) {
  const notes = [];

  if (stats) {
    notes.push(`Best estimate: about $${stats.median} based on ${stats.sampleSize} ${stats.basis} comps.`);
    notes.push(`A realistic quick-flip band is roughly $${stats.low} to $${stats.high}.`);
  } else {
    notes.push("There were not enough clean comps to build a trustworthy price band yet.");
  }

  if (!pricingConfigured) {
    notes.push("Add your eBay App ID in Settings to unlock live comp math inside the app.");
  }

  if (soldCount < 3) {
    notes.push("Sold comps were light, so current listings matter more than usual here.");
  }

  if (identification.pricingNotes?.length) {
    notes.push(...identification.pricingNotes);
  }

  if (activeCount === 0 && soldCount === 0) {
    notes.push("Try adding the brand, material, or model number to sharpen the search.");
  }

  return notes.slice(0, 4);
}

function cleanPriceSeries(values) {
  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);

  if (numericValues.length < 4) {
    return numericValues;
  }

  const q1 = percentile(numericValues, 0.25);
  const q3 = percentile(numericValues, 0.75);
  const iqr = q3 - q1;
  const min = q1 - iqr * 1.5;
  const max = q3 + iqr * 1.5;
  const trimmed = numericValues.filter((value) => value >= min && value <= max);
  return trimmed.length >= 3 ? trimmed : numericValues;
}

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 1) {
    return roundMoney(sortedValues[0]);
  }

  const index = (sortedValues.length - 1) * percentileValue;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const lower = sortedValues[lowerIndex];
  const upper = sortedValues[upperIndex];

  if (lowerIndex === upperIndex) {
    return roundMoney(lower);
  }

  return roundMoney(lower + (upper - lower) * (index - lowerIndex));
}

function extractNumericValue(value) {
  const numericValue = Number.parseFloat(String(value || ""));
  return Number.isFinite(numericValue) ? numericValue : null;
}

function buildManualSearchQuery(itemName, condition) {
  const queryBase = cleanText(itemName);
  if (!queryBase) return "";
  return condition === "for-parts" ? `${queryBase} for parts` : queryBase;
}

function humanizeCondition(condition) {
  switch (condition) {
    case "new-open-box":
      return "New / open box";
    case "used-great":
      return "Used - great";
    case "used-fair":
      return "Used - fair";
    case "for-parts":
      return "For parts";
    default:
      return "Unknown";
  }
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(Math.max(numericValue, min), max);
}

function roundMoney(value) {
  return Number(value.toFixed(2));
}

function stripCodeFences(text) {
  return cleanText(text).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function buildBrandModel(identification) {
  const parts = [identification.brand, identification.model].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Not specified";
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: 18, gap: 16, paddingBottom: 32 },
  heroCard: { backgroundColor: "rgba(255,248,239,0.92)", borderRadius: 28, padding: 20, gap: 12 },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.8, color: "#824e3b", textTransform: "uppercase" },
  settingsButton: { borderRadius: 999, backgroundColor: "#fff7ee", paddingHorizontal: 14, paddingVertical: 10 },
  settingsButtonText: { color: "#624232", fontWeight: "700" },
  heroTitle: { fontSize: 34, lineHeight: 38, fontWeight: "800", color: "#241915" },
  heroText: { fontSize: 16, lineHeight: 23, color: "#65554a" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.75)", paddingHorizontal: 12, paddingVertical: 9 },
  chipAccent: { backgroundColor: "rgba(240,176,90,0.22)" },
  chipText: { color: "#5f5047", fontSize: 13, fontWeight: "600" },
  chipTextAccent: { color: "#82491e" },
  panel: { backgroundColor: "rgba(255,250,243,0.92)", borderRadius: 28, padding: 18, gap: 14 },
  panelTitle: { fontSize: 24, fontWeight: "800", color: "#241915" },
  panelText: { fontSize: 15, lineHeight: 21, color: "#6c5d51" },
  photoActions: { flexDirection: "row", gap: 10 },
  actionButton: { flex: 1, borderRadius: 18, backgroundColor: "#d5723c", paddingVertical: 14, paddingHorizontal: 14, alignItems: "center" },
  actionButtonSecondary: { backgroundColor: "#fff4e7" },
  actionButtonText: { color: "#fffaf1", fontWeight: "800" },
  actionButtonTextSecondary: { color: "#704c3e" },
  preview: { width: "100%", height: 270, borderRadius: 22, backgroundColor: "#ead9c5" },
  previewPlaceholder: { width: "100%", height: 220, borderRadius: 22, backgroundColor: "#f3e3cf", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  previewPlaceholderText: { color: "#7d6d60", textAlign: "center" },
  field: { gap: 8 },
  fieldLabel: { fontSize: 15, fontWeight: "700", color: "#3b2c24" },
  input: { borderRadius: 18, backgroundColor: "#fffaf3", paddingHorizontal: 14, paddingVertical: 14, color: "#2e241e", fontSize: 15 },
  notesInput: { minHeight: 110 },
  conditionRow: { gap: 8, paddingVertical: 2 },
  conditionChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff6ec" },
  conditionChipActive: { backgroundColor: "#5c8259" },
  conditionChipText: { color: "#6f5b4c", fontWeight: "600" },
  conditionChipTextActive: { color: "#f8f1e7" },
  primaryButton: { borderRadius: 999, backgroundColor: "#bd6136", minHeight: 54, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#fff8ef", fontSize: 16, fontWeight: "800" },
  errorText: { color: "#8c2941", backgroundColor: "#fdeaf0", padding: 12, borderRadius: 14 },
  emptyState: { paddingVertical: 24, gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#2b1f19" },
  emptyText: { color: "#6c5d51", lineHeight: 20 },
  resultStack: { gap: 14 },
  summaryCard: { gap: 12, padding: 16, borderRadius: 22, backgroundColor: "#fffaf3" },
  resultLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1.3, color: "#824e3b", textTransform: "uppercase" },
  resultTitle: { fontSize: 24, fontWeight: "800", color: "#291f18" },
  resultSubtext: { color: "#715f52", lineHeight: 20 },
  summaryGrid: { gap: 10 },
  summaryBox: { backgroundColor: "#f8ebdb", borderRadius: 16, padding: 12, gap: 4 },
  summaryLabel: { fontSize: 12, fontWeight: "700", color: "#7c695a" },
  summaryValue: { color: "#2f241c", fontWeight: "700" },
  priceBand: { backgroundColor: "#f5e5d1", borderRadius: 18, padding: 14, gap: 6 },
  priceBandValue: { fontSize: 30, lineHeight: 34, fontWeight: "800", color: "#2a1d16" },
  guidanceLine: { color: "#6f5e52", lineHeight: 20 },
  linkRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  linkButton: { backgroundColor: "#e7f0e2", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 11 },
  linkButtonText: { color: "#436142", fontWeight: "800" },
  compSection: { gap: 10 },
  compSectionTitle: { fontSize: 20, fontWeight: "800", color: "#2e221b" },
  compCard: { flexDirection: "row", gap: 12, backgroundColor: "#fffaf3", borderRadius: 18, padding: 10 },
  compImage: { width: 84, height: 84, borderRadius: 14, backgroundColor: "#ead8c4" },
  compImageFallback: { width: 84, height: 84, borderRadius: 14, backgroundColor: "#ead8c4" },
  compCopy: { flex: 1, gap: 4 },
  compTitle: { fontWeight: "700", color: "#2d241d" },
  compMeta: { color: "#736256" },
  compPrice: { color: "#4f6f4f", fontWeight: "800" },
  modalScreen: { flex: 1, backgroundColor: "#f4e8d7" },
  modalContent: { padding: 20, gap: 14, paddingBottom: 32 },
  modalTitle: { fontSize: 28, fontWeight: "800", color: "#291f18" },
  modalText: { color: "#6b5a4e", lineHeight: 22 },
  modalButtons: { flexDirection: "row", gap: 10 },
  themeRow: { flexDirection: "row", gap: 10 },
  themeButton: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  themeButtonText: { fontWeight: "800" },
});
