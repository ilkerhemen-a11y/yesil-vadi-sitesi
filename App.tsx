import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, TextInput, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Apartment = { id: number; resident: string; paid: number };
type Expense = { id: string; title: string; amount: number; date: string };
type Store = { apartments: Apartment[]; monthlyDues: number; expenses: Expense[]; month: string };
const STORAGE_KEY = "yesil-vadi-sitesi-v1";
const thisMonth = new Date().toISOString().slice(0, 7);
const initialData: Store = {
  apartments: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, resident: "", paid: 0 })),
  monthlyDues: 600,
  expenses: [],
  month: thisMonth
};
const money = (n: number) => n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });

export default function App() {
  const [data, setData] = useState<Store>(initialData);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"home" | "apartments" | "expenses" | "settings">("home");
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [duesInput, setDuesInput] = useState("600");

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Store;
          setData(parsed);
          setDuesInput(String(parsed.monthlyDues));
        }
      } catch {
        Alert.alert("Veri okunamadı", "Kayıtlı veriler yüklenirken bir sorun oluştu.");
      } finally { setLoaded(true); }
    })();
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => Alert.alert("Kayıt hatası", "Değişiklikler cihaza kaydedilemedi."));
  }, [data, loaded]);

  const expected = data.apartments.length * data.monthlyDues;
  const collected = data.apartments.reduce((sum, a) => sum + a.paid, 0);
  const outstanding = Math.max(0, expected - collected);
  const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const paidCount = data.apartments.filter(a => a.paid >= data.monthlyDues).length;

  const updateApartment = (id: number, patch: Partial<Apartment>) =>
    setData(prev => ({ ...prev, apartments: prev.apartments.map(a => a.id === id ? { ...a, ...patch } : a) }));

  const addPayment = (apartment: Apartment) => {
    Alert.prompt?.("Ödeme al", apartment.paid ? "Bu daire için alınan toplam ödemeyi girin (TL)." : "Alınan ödeme tutarını girin (TL).", [
      { text: "İptal", style: "cancel" },
      { text: "Kaydet", onPress: (value?: string) => {
        const amount = Number((value || "").replace(",", "."));
        if (!Number.isFinite(amount) || amount <= 0) { Alert.alert("Geçersiz tutar", "Pozitif bir ödeme tutarı girin."); return; }
        updateApartment(apartment.id, { paid: apartment.paid + amount });
      }}
    ], "plain-text", "");
    if (!Alert.prompt) Alert.alert("Ödeme girişi", "Ödeme girişi için sonraki sürümde platformdan bağımsız form kullanılacak.");
  };

  const addExpense = () => {
    const amount = Number(expenseAmount.replace(",", "."));
    if (!expenseTitle.trim() || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Bilgileri kontrol edin", "Gider adı ve sıfırdan büyük bir tutar girin."); return;
    }
    setData(prev => ({ ...prev, expenses: [{ id: Date.now().toString(), title: expenseTitle.trim(), amount, date: new Date().toISOString().slice(0, 10) }, ...prev.expenses] }));
    setExpenseTitle(""); setExpenseAmount("");
    Alert.alert("Kaydedildi", "Gider kaydı eklendi.");
  };

  const saveDues = () => {
    const amount = Number(duesInput.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) { Alert.alert("Geçersiz aidat", "Pozitif bir aidat tutarı girin."); return; }
    Alert.alert("Aidat tutarını değiştir", "Yeni tutar mevcut ayın aidat tutarı olarak uygulanacak. Geçmiş ayların ayrı kayıtları sonraki geliştirmede eklenecek.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Uygula", onPress: () => setData(prev => ({ ...prev, monthlyDues: amount })) }
    ]);
  };

  const header = (title: string, subtitle: string) => <View style={styles.header}><Text style={styles.brand}>YEŞİL VADİ SİTESİ</Text><Text style={styles.pageTitle}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#14532d" />
      {tab === "home" && <ScrollView contentContainerStyle={styles.content}>
        {header("Yönetim paneli", "Site gelir ve aidat özeti")}
        <View style={styles.grid}>
          <Metric title="Aylık beklenen aidat" value={money(expected)} />
          <Metric title="Tahsil edilen" value={money(collected)} />
          <Metric title="Kalan aidat" value={money(outstanding)} />
          <Metric title="Toplam gider" value={money(totalExpenses)} />
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Aidat durumu · {data.month}</Text>
          <Text style={styles.bigNumber}>{paidCount} / {data.apartments.length} daire</Text>
          <Text style={styles.muted}>Aidatını tamamen ödeyen daire sayısı</Text>
          <View style={styles.track}><View style={[styles.progress, { width: (Math.min(100, expected ? collected / expected * 100 : 0) + "%") as any }]} /></View>
          <Text style={styles.muted}>{expected ? Math.round(collected / expected * 100) : 0}% tahsilat</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Hızlı işlemler</Text>
          <Action title="Daire ve aidatları görüntüle" onPress={() => setTab("apartments")} />
          <Action title="Yeni gider ekle" onPress={() => setTab("expenses")} />
          <Action title="Aidat tutarını ayarla" onPress={() => setTab("settings")} />
        </View>
        <Text style={styles.footnote}>Veriler bu cihazda çevrimdışı saklanır. Uygulamayı silmeden önce yedekleme özelliği eklenmelidir.</Text>
      </ScrollView>}
      {tab === "apartments" && <ScrollView contentContainerStyle={styles.content}>
        {header("Daireler", "20 daire için bu ayın ödeme durumu")}
        {data.apartments.map(a => {
          const remaining = Math.max(0, data.monthlyDues - a.paid);
          return <View style={styles.apartment} key={a.id}>
            <View style={styles.apartmentTop}><Text style={styles.apartmentName}>Daire {String(a.id).padStart(2, "0")}</Text><Text style={[styles.badge, { backgroundColor: remaining === 0 ? "#dcfce7" : "#fef3c7", color: remaining === 0 ? "#166534" : "#92400e" }]}>{remaining === 0 ? "Ödendi" : "Borç var"}</Text></View>
            <TextInput style={styles.input} value={a.resident} placeholder="Daire sakini (isteğe bağlı)" onChangeText={v => updateApartment(a.id, { resident: v })} />
            <View style={styles.row}><Text style={styles.muted}>Ödenen: {money(a.paid)}</Text><Text style={styles.due}>Kalan: {money(remaining)}</Text></View>
            <TouchableOpacity style={styles.smallButton} onPress={() => {
              if (typeof (Alert as any).prompt === "function") addPayment(a);
              else Alert.alert("Ödeme kaydı", "Bu cihazda hızlı giriş penceresi desteklenmiyor. Bir sonraki adımda tüm Android cihazlarda çalışan ödeme formu ekleyeceğiz.");
            }}><Text style={styles.smallButtonText}>Ödeme ekle</Text></TouchableOpacity>
          </View>;
        })}
      </ScrollView>}
      {tab === "expenses" && <ScrollView contentContainerStyle={styles.content}>
        {header("Gelir / gider", "Site harcamalarını kaydet ve takip et")}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Yeni gider</Text>
          <TextInput style={styles.input} placeholder="Gider adı (örn. temizlik)" value={expenseTitle} onChangeText={setExpenseTitle} />
          <TextInput style={styles.input} placeholder="Tutar (TL)" keyboardType="decimal-pad" value={expenseAmount} onChangeText={setExpenseAmount} />
          <TouchableOpacity style={styles.primaryButton} onPress={addExpense}><Text style={styles.primaryButtonText}>Gideri kaydet</Text></TouchableOpacity>
        </View>
        <View style={styles.panel}><Text style={styles.panelTitle}>Gider geçmişi</Text>
          {data.expenses.length === 0 ? <Text style={styles.muted}>Henüz gider kaydı yok.</Text> : data.expenses.map(e => <View key={e.id} style={styles.listRow}><View style={{ flex: 1 }}><Text style={styles.apartmentName}>{e.title}</Text><Text style={styles.muted}>{e.date}</Text></View><Text style={styles.due}>{money(e.amount)}</Text></View>)}
        </View>
      </ScrollView>}
      {tab === "settings" && <ScrollView contentContainerStyle={styles.content}>
        {header("Ayarlar", "Aidat ve uygulama bilgileri")}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Aylık aidat tutarı</Text>
          <Text style={styles.muted}>Şu anki tutar: {money(data.monthlyDues)} / daire</Text>
          <TextInput style={styles.input} value={duesInput} onChangeText={setDuesInput} keyboardType="decimal-pad" placeholder="Yeni aidat tutarı (TL)" />
          <TouchableOpacity style={styles.primaryButton} onPress={saveDues}><Text style={styles.primaryButtonText}>Aidat tutarını kaydet</Text></TouchableOpacity>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Uygulama bilgisi</Text>
          <Text style={styles.muted}>• 20 daire hazır tanımlıdır.</Text>
          <Text style={styles.muted}>• İnternet bağlantısı olmadan çalışacak şekilde hazırlanıyor.</Text>
          <Text style={styles.muted}>• Veriler cihazın yerel hafızasında saklanır.</Text>
          <Text style={styles.muted}>• Yedekle / geri yükle özelliği APK öncesi tamamlanmalı.</Text>
        </View>
      </ScrollView>}
      <View style={styles.nav}>
        <NavItem label="Ana sayfa" icon="⌂" active={tab === "home"} onPress={() => setTab("home")} />
        <NavItem label="Daireler" icon="▦" active={tab === "apartments"} onPress={() => setTab("apartments")} />
        <NavItem label="Giderler" icon="₺" active={tab === "expenses"} onPress={() => setTab("expenses")} />
        <NavItem label="Ayarlar" icon="⚙" active={tab === "settings"} onPress={() => setTab("settings")} />
      </View>
    </SafeAreaView>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricTitle}>{title}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}
function Action({ title, onPress }: { title: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.action} onPress={onPress}><Text style={styles.actionText}>{title}</Text><Text style={styles.actionArrow}>›</Text></TouchableOpacity>;
}
function NavItem({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity style={styles.navItem} onPress={onPress}><Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text><Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text></TouchableOpacity>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f3f7f3" },
  content: { padding: 16, paddingBottom: 28 },
  header: { backgroundColor: "#14532d", borderRadius: 20, padding: 20, marginBottom: 16 },
  brand: { color: "#bbf7d0", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginBottom: 12 },
  pageTitle: { color: "#fff", fontSize: 25, fontWeight: "800" },
  subtitle: { color: "#dcfce7", fontSize: 13, marginTop: 5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  metric: { width: "48%", flexGrow: 1, backgroundColor: "#fff", borderRadius: 15, padding: 14, minHeight: 94, justifyContent: "space-between", borderWidth: 1, borderColor: "#e2e8e2" },
  metricTitle: { color: "#64748b", fontSize: 12 },
  metricValue: { color: "#14532d", fontWeight: "800", fontSize: 18, marginTop: 10 },
  panel: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 13, borderWidth: 1, borderColor: "#e2e8e2" },
  panelTitle: { color: "#172b20", fontSize: 16, fontWeight: "800", marginBottom: 12 },
  bigNumber: { fontSize: 27, fontWeight: "800", color: "#14532d", marginBottom: 4 },
  muted: { color: "#64748b", fontSize: 12, marginTop: 4 },
  track: { height: 8, backgroundColor: "#e2e8e2", borderRadius: 9, overflow: "hidden", marginTop: 14 },
  progress: { height: 8, backgroundColor: "#16a34a", borderRadius: 9 },
  footnote: { color: "#64748b", fontSize: 11, lineHeight: 16, paddingHorizontal: 4, marginTop: 3 },
  action: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#edf2ed" },
  actionText: { color: "#166534", fontWeight: "700", fontSize: 14 },
  actionArrow: { color: "#16a34a", fontSize: 25 },
  apartment: { backgroundColor: "#fff", borderRadius: 15, padding: 14, marginBottom: 11, borderWidth: 1, borderColor: "#e2e8e2" },
  apartmentTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  apartmentName: { color: "#172b20", fontWeight: "800", fontSize: 15 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, overflow: "hidden", fontSize: 11, fontWeight: "800" },
  input: { backgroundColor: "#f8faf8", borderWidth: 1, borderColor: "#dbe5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 9, color: "#172b20" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  due: { color: "#166534", fontWeight: "800" },
  smallButton: { backgroundColor: "#166534", borderRadius: 9, padding: 10, alignItems: "center", marginTop: 12 },
  smallButtonText: { color: "#fff", fontWeight: "800" },
  primaryButton: { backgroundColor: "#166534", padding: 13, borderRadius: 10, alignItems: "center", marginTop: 2 },
  primaryButtonText: { color: "#fff", fontWeight: "800" },
  listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#edf2ed" },
  nav: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#dbe5db", paddingTop: 9, paddingBottom: 8, justifyContent: "space-around" },
  navItem: { alignItems: "center", minWidth: 62 },
  navIcon: { fontSize: 20, color: "#64748b" },
  navLabel: { color: "#64748b", fontSize: 10, marginTop: 2 },
  navActive: { color: "#166534", fontWeight: "900" }
});