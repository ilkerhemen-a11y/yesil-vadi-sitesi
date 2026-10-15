import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, TextInput, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Apartment = { id: number; resident: string };
type Payment = { id: string; apartmentId: number; month: string; amount: number; date: string };
type Expense = { id: string; title: string; amount: number; date: string; category?: string };
type OtherIncome = { id: string; title: string; amount: number; date: string };
type Store = { apartments: Apartment[]; duesByMonth: Record<string, number>; payments: Payment[]; expenses: Expense[]; startMonth: string; incomes?: OtherIncome[]; openingBalance?: number };
type Tab = "home" | "apartments" | "expenses" | "settings";
const STORAGE_KEY = "yesil-vadi-sitesi-v2";
const monthNow = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
const thisMonth = monthNow();
const expenseCategories = ["Elektrik", "Su", "Temizlik", "Asansör", "Bahçe", "Tamirat", "Personel", "Yönetim", "Diğer"];
const initialData: Store = {
  apartments: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, resident: "" })),
  duesByMonth: { [thisMonth]: 600 }, payments: [], expenses: [], incomes: [], openingBalance: 0, startMonth: thisMonth
};
const money = (n: number) => n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
const monthLabel = (month: string) => { const [y, m] = month.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }); };
const shiftMonth = (month: string, delta: number) => { const [y, m] = month.split("-").map(Number); const d = new Date(y, m - 1 + delta, 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
const monthsBetween = (start: string, end: string) => { const out: string[] = []; let m = start; for (let i = 0; m <= end && i < 240; i++, m = shiftMonth(m, 1)) out.push(m); return out; };

export default function App() {
  const [data, setData] = useState<Store>(initialData);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [selectedMonth, setSelectedMonth] = useState(thisMonth);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Diğer");
  const [incomeTitle, setIncomeTitle] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [editingIncome, setEditingIncome] = useState<OtherIncome | null>(null);
  const [editIncomeTitle, setEditIncomeTitle] = useState("");
  const [editIncomeAmount, setEditIncomeAmount] = useState("");
  const [editIncomeDate, setEditIncomeDate] = useState("");
  const [openingBalanceInput, setOpeningBalanceInput] = useState("0");
  const [paymentApartment, setPaymentApartment] = useState<Apartment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editExpenseTitle, setEditExpenseTitle] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState("");
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [duesInput, setDuesInput] = useState("600");
  const [duesMonthInput, setDuesMonthInput] = useState(thisMonth);
  const [statementApartment, setStatementApartment] = useState<Apartment | null>(null);
  const [apartmentSearch, setApartmentSearch] = useState("");
  const [showDebtorsOnly, setShowDebtorsOnly] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.apartments) && parsed.duesByMonth && Array.isArray(parsed.payments)) {
            setData({ ...(parsed as Store), incomes: Array.isArray(parsed.incomes) ? parsed.incomes : [], openingBalance: Number(parsed.openingBalance) || 0 });
            setOpeningBalanceInput(String(Number(parsed.openingBalance) || 0));
          } else {
            // Import earlier prototype data, preserving residents, expenses and recorded payments as far as possible.
            const legacyRaw = await AsyncStorage.getItem("yesil-vadi-sitesi-v1");
            if (legacyRaw) {
              const legacy = JSON.parse(legacyRaw);
              const imported: Store = {
                apartments: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, resident: legacy.apartments?.[i]?.resident || "" })),
                duesByMonth: { [thisMonth]: Number(legacy.monthlyDues) || 600 },
                payments: (legacy.apartments || []).filter((a: any) => Number(a.paid) > 0).map((a: any) => ({ id: "import-" + a.id, apartmentId: a.id, month: thisMonth, amount: Number(a.paid), date: new Date().toISOString().slice(0, 10) })),
                expenses: legacy.expenses || [], startMonth: thisMonth
              };
              setData(imported);
            }
          }
        }
      } catch { Alert.alert("Veri okunamadı", "Kayıtlı veriler yüklenirken sorun oluştu."); }
      finally { setLoaded(true); }
    })();
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => Alert.alert("Kayıt hatası", "Değişiklikler cihaza kaydedilemedi."));
  }, [data, loaded]);

  const getDues = (month: string) => {
    const effective = Object.keys(data.duesByMonth).filter(m => m <= month).sort();
    return effective.length ? data.duesByMonth[effective[effective.length - 1]] : 0;
  };
  const paymentsFor = (apartmentId: number, month: string) => data.payments.filter(p => p.apartmentId === apartmentId && p.month === month).reduce((sum, p) => sum + p.amount, 0);
  const monthDues = getDues(selectedMonth);
  const monthList = monthsBetween(data.startMonth, selectedMonth);
  const duesThrough = (month: string) => monthsBetween(data.startMonth, month).reduce((sum, m) => sum + getDues(m), 0);
  const paidThrough = (apartmentId: number, month: string) => data.payments.filter(p => p.apartmentId === apartmentId && p.month <= month).reduce((sum, p) => sum + p.amount, 0);
  const balanceFor = (apartmentId: number, month: string) => {
    const due = duesThrough(month);
    const paid = paidThrough(apartmentId, month);
    return { debt: Math.max(0, due - paid), credit: Math.max(0, paid - due) };
  };
  const monthExpected = data.apartments.length * monthDues;
  const monthCollected = data.payments.filter(p => p.month === selectedMonth).reduce((sum, p) => sum + p.amount, 0);
  const previousMonth = shiftMonth(selectedMonth, -1);
  const previousDues = duesThrough(previousMonth);
  const monthRemaining = data.apartments.reduce((sum, a) => sum + Math.max(0, monthDues - Math.min(monthDues, Math.max(0, paidThrough(a.id, selectedMonth) - previousDues))), 0);
  const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const monthExpenses = data.expenses.filter(e => e.date.slice(0, 7) === selectedMonth).reduce((sum, e) => sum + e.amount, 0);
  const totalOtherIncome = (data.incomes || []).reduce((sum, i) => sum + i.amount, 0);
  const openingBalance = Number(data.openingBalance) || 0;
  const cashBalance = openingBalance + data.payments.reduce((sum, p) => sum + p.amount, 0) + totalOtherIncome - totalExpenses;
  const allDebt = data.apartments.reduce((sum, a) => sum + balanceFor(a.id, selectedMonth).debt, 0);
  const allCredit = data.apartments.reduce((sum, a) => sum + balanceFor(a.id, selectedMonth).credit, 0);
  const paidCount = data.apartments.filter(a => Math.min(monthDues, Math.max(0, paidThrough(a.id, selectedMonth) - previousDues)) >= monthDues && monthDues > 0).length;

  const updateApartment = (id: number, patch: Partial<Apartment>) => setData(prev => ({ ...prev, apartments: prev.apartments.map(a => a.id === id ? { ...a, ...patch } : a) }));
  const addPayment = () => {
    const amount = Number(paymentAmount.replace(",", "."));
    if (!paymentApartment || !Number.isFinite(amount) || amount <= 0) { Alert.alert("Geçersiz tutar", "Sıfırdan büyük bir ödeme tutarı girin."); return; }
    setData(prev => ({ ...prev, payments: [...prev.payments, { id: Date.now().toString(), apartmentId: paymentApartment.id, month: selectedMonth, amount, date: new Date().toISOString().slice(0, 10) }] }));
    setPaymentApartment(null); setPaymentAmount("");
    Alert.alert("Ödeme kaydedildi", "Ödeme " + monthLabel(selectedMonth) + " dönemine eklendi.");
  };
  const openEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setEditPaymentAmount(String(payment.amount));
    setEditPaymentDate(payment.date);
  };
  const saveEditedPayment = () => {
    const amount = Number(editPaymentAmount.replace(",", "."));
    if (!editingPayment || !Number.isFinite(amount) || amount <= 0 || !/^\\d{4}-\\d{2}-\\d{2}$/.test(editPaymentDate)) {
      Alert.alert("Bilgileri kontrol edin", "Pozitif bir tutar ve YYYY-AA-GG biçiminde geçerli tarih girin.");
      return;
    }
    setData(prev => ({ ...prev, payments: prev.payments.map(p => p.id === editingPayment.id ? { ...p, amount, date: editPaymentDate } : p) }));
    setEditingPayment(null);
    Alert.alert("Güncellendi", "Ödeme kaydı düzenlendi.");
  };
  const deletePayment = (payment: Payment) => {
    Alert.alert("Ödemeyi sil", "Bu ödeme kaydı kalıcı olarak silinsin mi?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => setData(prev => ({ ...prev, payments: prev.payments.filter(p => p.id !== payment.id) })) }
    ]);
  };
  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense); setEditExpenseTitle(expense.title); setEditExpenseAmount(String(expense.amount)); setEditExpenseDate(expense.date);
  };
  const saveEditedExpense = () => {
    const amount = Number(editExpenseAmount.replace(",", "."));
    if (!editingExpense || !editExpenseTitle.trim() || !Number.isFinite(amount) || amount <= 0 || !/^\\d{4}-\\d{2}-\\d{2}$/.test(editExpenseDate)) {
      Alert.alert("Bilgileri kontrol edin", "Gider adı, pozitif tutar ve YYYY-AA-GG biçiminde tarih girin."); return;
    }
    setData(prev => ({ ...prev, expenses: prev.expenses.map(e => e.id === editingExpense.id ? { ...e, title: editExpenseTitle.trim(), amount, date: editExpenseDate } : e) }));
    setEditingExpense(null); Alert.alert("Güncellendi", "Gider kaydı düzenlendi.");
  };
  const deleteExpense = (expense: Expense) => {
    Alert.alert("Gideri sil", "Bu gider kaydı silinsin mi?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== expense.id) })) }
    ]);
  };
  const addExpense = () => {
    const amount = Number(expenseAmount.replace(",", "."));
    if (!expenseTitle.trim() || !Number.isFinite(amount) || amount <= 0) { Alert.alert("Bilgileri kontrol edin", "Gider adı ve sıfırdan büyük tutar girin."); return; }
    setData(prev => ({ ...prev, expenses: [{ id: Date.now().toString(), title: expenseTitle.trim(), amount, category: expenseCategory, date: new Date().toISOString().slice(0, 10) }, ...prev.expenses] }));
    setExpenseTitle(""); setExpenseAmount(""); Alert.alert("Kaydedildi", "Gider kaydı eklendi.");
  };
  const addIncome = () => {
    const amount = Number(incomeAmount.replace(",", "."));
    if (!incomeTitle.trim() || !Number.isFinite(amount) || amount <= 0) { Alert.alert("Bilgileri kontrol edin", "Gelir açıklaması ve sıfırdan büyük tutar girin."); return; }
    setData(prev => ({ ...prev, incomes: [{ id: Date.now().toString(), title: incomeTitle.trim(), amount, date: new Date().toISOString().slice(0, 10) }, ...(prev.incomes || [])] }));
    setIncomeTitle(""); setIncomeAmount(""); Alert.alert("Kaydedildi", "Diğer gelir kaydı eklendi.");
  };
  const openEditIncome = (income: OtherIncome) => {
    setEditingIncome(income); setEditIncomeTitle(income.title); setEditIncomeAmount(String(income.amount)); setEditIncomeDate(income.date);
  };
  const saveEditedIncome = () => {
    const amount = Number(editIncomeAmount.replace(",", "."));
    if (!editingIncome || !editIncomeTitle.trim() || !Number.isFinite(amount) || amount <= 0 || !/^\\d{4}-\\d{2}-\\d{2}$/.test(editIncomeDate)) {
      Alert.alert("Bilgileri kontrol edin", "Gelir açıklaması, pozitif tutar ve YYYY-AA-GG biçiminde tarih girin."); return;
    }
    setData(prev => ({ ...prev, incomes: (prev.incomes || []).map(i => i.id === editingIncome.id ? { ...i, title: editIncomeTitle.trim(), amount, date: editIncomeDate } : i) }));
    setEditingIncome(null); Alert.alert("Güncellendi", "Gelir kaydı düzenlendi.");
  };
  const deleteIncome = (income: OtherIncome) => {
    Alert.alert("Geliri sil", "Bu gelir kaydı silinsin mi?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => setData(prev => ({ ...prev, incomes: (prev.incomes || []).filter(i => i.id !== income.id) })) }
    ]);
  };
  const saveOpeningBalance = () => {
    const amount = Number(openingBalanceInput.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0) { Alert.alert("Geçersiz tutar", "Açılış kasa bakiyesi sıfır veya daha büyük olmalıdır."); return; }
    Alert.alert("Açılış bakiyesini kaydet", "Açılış kasası " + money(amount) + " olarak kaydedilecek.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Kaydet", onPress: () => setData(prev => ({ ...prev, openingBalance: amount })) }
    ]);
  };
  const saveDues = () => {
    const amount = Number(duesInput.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}$/.test(duesMonthInput)) { Alert.alert("Bilgileri kontrol edin", "Geçerli bir aidat tutarı ve YYYY-AA biçiminde başlangıç ayı girin."); return; }
    Alert.alert("Aidat değişikliğini onayla", monthLabel(duesMonthInput) + " döneminden itibaren aidat " + money(amount) + " olacak. Önceki dönemlerin tutarı korunacak.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Uygula", onPress: () => setData(prev => ({ ...prev, duesByMonth: { ...prev.duesByMonth, [duesMonthInput]: amount } })) }
    ]);
  };
  const header = (title: string, subtitle: string) => <View style={styles.header}><Text style={styles.brand}>YEŞİL VADİ SİTESİ</Text><Text style={styles.pageTitle}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>;
  const monthPicker = <View style={styles.monthPicker}><TouchableOpacity style={styles.monthArrow} onPress={() => setSelectedMonth(m => shiftMonth(m, -1))}><Text style={styles.monthArrowText}>‹</Text></TouchableOpacity><Text style={styles.monthText}>{monthLabel(selectedMonth)}</Text><TouchableOpacity style={styles.monthArrow} onPress={() => setSelectedMonth(m => shiftMonth(m, 1))}><Text style={styles.monthArrowText}>›</Text></TouchableOpacity></View>;

  return <SafeAreaView style={styles.safe}><View style={styles.topSafeSpace} />
    <StatusBar barStyle="light-content" backgroundColor="#14532d" />
    {tab === "home" && <ScrollView contentContainerStyle={styles.content}>
      {header("Yönetim paneli", "Site gelir ve aidat özeti")}{monthPicker}
      <View style={styles.panel}><Text style={styles.panelTitle}>Güncel kasa bakiyesi</Text><Text style={styles.bigNumber}>{money(cashBalance)}</Text><Text style={styles.muted}>Açılış bakiyesi + aidat tahsilatları + diğer gelirler − giderler.</Text></View>
      <View style={styles.grid}><Metric title="Beklenen aidat" value={money(monthExpected)} /><Metric title="Tahsil edilen" value={money(monthCollected)} /><Metric title="Bu ay kalan" value={money(monthRemaining)} /><Metric title="Bu ay gider" value={money(monthExpenses)} /></View>
      <View style={styles.panel}><Text style={styles.panelTitle}>Aidat durumu</Text><Text style={styles.bigNumber}>{paidCount} / {data.apartments.length} daire</Text><Text style={styles.muted}>{monthLabel(selectedMonth)} döneminde aidatını tamamen ödeyen daire</Text><View style={styles.track}><View style={[styles.progress, { width: (Math.min(100, monthExpected ? monthCollected / monthExpected * 100 : 0) + "%") as any }]} /></View><Text style={styles.muted}>{monthExpected ? Math.round(monthCollected / monthExpected * 100) : 0}% tahsilat</Text></View>
      <View style={styles.panel}><Text style={styles.panelTitle}>Toplam kalan borç</Text><Text style={styles.bigNumber}>{money(allDebt)}</Text><Text style={styles.muted}>Ödemeler önceki dönemlerin birikmiş borcunu da karşılar.</Text><Text style={styles.panelTitle}>Fazla ödeme bakiyesi</Text><Text style={styles.bigNumber}>{money(allCredit)}</Text><Text style={styles.muted}>Aidat borcunu aşan ödemeler sonraki dönemlere alacak olarak devreder.</Text></View>
      <View style={styles.panel}><Text style={styles.panelTitle}>Hızlı işlemler</Text><Action title="Daireleri ve ödemeleri görüntüle" onPress={() => setTab("apartments")} /><Action title="Yeni gider ekle" onPress={() => setTab("expenses")} /><Action title="Aidat tutarını ayarla" onPress={() => setTab("settings")} /></View>
    </ScrollView>}
    {tab === "apartments" && <ScrollView contentContainerStyle={styles.content}>
      {header("Daireler", "Daire bazında aylık borç ve ödeme takibi")}{monthPicker}
      <View style={styles.panel}><Text style={styles.panelTitle}>Daire ara ve filtrele</Text><TextInput style={styles.input} value={apartmentSearch} onChangeText={setApartmentSearch} placeholder="Daire numarası veya sakin adı" /><TouchableOpacity style={styles.filterButton} onPress={() => setShowDebtorsOnly(v => !v)}><Text style={styles.filterButtonText}>{showDebtorsOnly ? "Tüm daireleri göster" : "Yalnızca borçlu daireleri göster"}</Text></TouchableOpacity></View>
      {data.apartments.filter(a => String(a.id).includes(apartmentSearch.trim()) || a.resident.toLocaleLowerCase("tr-TR").includes(apartmentSearch.trim().toLocaleLowerCase("tr-TR"))).filter(a => !showDebtorsOnly || balanceFor(a.id, selectedMonth).debt > 0).map(a => { const paid = paymentsFor(a.id, selectedMonth); const balance = balanceFor(a.id, selectedMonth); const remaining = Math.max(0, monthDues - Math.min(monthDues, Math.max(0, paidThrough(a.id, selectedMonth) - duesThrough(shiftMonth(selectedMonth, -1))))); const debt = balance.debt; return <View style={styles.apartment} key={a.id}>
        <View style={styles.apartmentTop}><Text style={styles.apartmentName}>Daire {String(a.id).padStart(2, "0")}</Text><Text style={[styles.badge, { backgroundColor: remaining === 0 ? "#dcfce7" : "#fef3c7", color: remaining === 0 ? "#166534" : "#92400e" }]}>{remaining === 0 ? "Ödendi" : "Borç var"}</Text></View>
        <TextInput style={styles.input} value={a.resident} placeholder="Daire sakini (isteğe bağlı)" onChangeText={v => updateApartment(a.id, { resident: v })} />
        <View style={styles.row}><Text style={styles.muted}>Bu ay ödenen: {money(paid)}</Text><Text style={styles.due}>Bu ay kalan: {money(remaining)}</Text></View>
        <Text style={styles.debtLine}>Seçili aya kadar toplam kalan aidat: {money(debt)}</Text>{balance.credit > 0 && <Text style={styles.creditLine}>Sonraki aya devreden fazla ödeme: {money(balance.credit)}</Text>}
        <TouchableOpacity style={styles.statementButton} onPress={() => setStatementApartment(a)}><Text style={styles.statementButtonText}>Hesap ekstresini görüntüle</Text></TouchableOpacity>
        <TouchableOpacity style={styles.smallButton} onPress={() => { setPaymentApartment(a); setPaymentAmount(""); }}><Text style={styles.smallButtonText}>Bu aya ödeme ekle</Text></TouchableOpacity>
        {data.payments.filter(p => p.apartmentId === a.id && p.month === selectedMonth).length > 0 && <View style={styles.history}><Text style={styles.historyTitle}>Ödeme hareketleri</Text>{data.payments.filter(p => p.apartmentId === a.id && p.month === selectedMonth).map(p => <View style={styles.paymentHistoryRow} key={p.id}><View style={{ flex: 1 }}><Text style={styles.muted}>{p.date}</Text><Text style={styles.paymentAmount}>{money(p.amount)}</Text></View><TouchableOpacity style={styles.editButton} onPress={() => openEditPayment(p)}><Text style={styles.editButtonText}>Düzenle</Text></TouchableOpacity><TouchableOpacity style={styles.deleteButton} onPress={() => deletePayment(p)}><Text style={styles.deleteButtonText}>Sil</Text></TouchableOpacity></View>)}</View>}
      </View>; })}
    </ScrollView>}
    {tab === "expenses" && <ScrollView contentContainerStyle={styles.content}>{header("Gelir / gider", "Aylık tahsilat ve harcama raporu")}{monthPicker}
      <View style={styles.panel}><Text style={styles.panelTitle}>{monthLabel(selectedMonth)} raporu</Text><View style={styles.listRow}><Text style={styles.muted}>Bu ay tahsil edilen aidat</Text><Text style={styles.due}>{money(monthCollected)}</Text></View><View style={styles.listRow}><Text style={styles.muted}>Bu ay gider</Text><Text style={styles.due}>{money(data.expenses.filter(e => e.date.slice(0, 7) === selectedMonth).reduce((sum, e) => sum + e.amount, 0))}</Text></View><View style={styles.listRow}><Text style={styles.apartmentName}>Net nakit akışı</Text><Text style={styles.due}>{money(monthCollected - data.expenses.filter(e => e.date.slice(0, 7) === selectedMonth).reduce((sum, e) => sum + e.amount, 0))}</Text></View></View>
      <View style={styles.panel}><Text style={styles.panelTitle}>{selectedMonth.slice(0, 4)} yılı mali özeti</Text><View style={styles.listRow}><Text style={styles.muted}>Aidat tahsilatları</Text><Text style={styles.due}>{money(data.payments.filter(p => p.month.startsWith(selectedMonth.slice(0, 4))).reduce((s, p) => s + p.amount, 0))}</Text></View><View style={styles.listRow}><Text style={styles.muted}>Diğer gelirler</Text><Text style={styles.due}>{money((data.incomes || []).filter(i => i.date.startsWith(selectedMonth.slice(0, 4))).reduce((s, i) => s + i.amount, 0))}</Text></View><View style={styles.listRow}><Text style={styles.muted}>Giderler</Text><Text style={styles.due}>{money(data.expenses.filter(e => e.date.startsWith(selectedMonth.slice(0, 4))).reduce((s, e) => s + e.amount, 0))}</Text></View><View style={styles.listRow}><Text style={styles.apartmentName}>Yıllık net hareket</Text><Text style={styles.due}>{money(data.payments.filter(p => p.month.startsWith(selectedMonth.slice(0, 4))).reduce((s, p) => s + p.amount, 0) + (data.incomes || []).filter(i => i.date.startsWith(selectedMonth.slice(0, 4))).reduce((s, i) => s + i.amount, 0) - data.expenses.filter(e => e.date.startsWith(selectedMonth.slice(0, 4))).reduce((s, e) => s + e.amount, 0))}</Text></View><Text style={styles.fieldLabel}>Kategoriye göre giderler</Text>{expenseCategories.map(category => { const total = data.expenses.filter(e => e.date.startsWith(selectedMonth.slice(0, 4)) && (e.category || "Diğer") === category).reduce((s, e) => s + e.amount, 0); return total > 0 ? <View key={category} style={styles.listRow}><Text style={styles.muted}>{category}</Text><Text style={styles.due}>{money(total)}</Text></View> : null; })}</View>
      <View style={styles.panel}><Text style={styles.panelTitle}>Diğer gelir ekle</Text><Text style={styles.muted}>Aidat dışındaki para girişlerini buradan kaydedebilirsin.</Text><TextInput style={styles.input} placeholder="Gelir açıklaması" value={incomeTitle} onChangeText={setIncomeTitle} /><TextInput style={styles.input} placeholder="Tutar (TL)" keyboardType="decimal-pad" value={incomeAmount} onChangeText={setIncomeAmount} /><TouchableOpacity style={styles.primaryButton} onPress={addIncome}><Text style={styles.primaryButtonText}>Geliri kaydet</Text></TouchableOpacity></View>
<View style={styles.panel}><Text style={styles.panelTitle}>Diğer gelir geçmişi</Text>{!(data.incomes || []).length ? <Text style={styles.muted}>Henüz diğer gelir kaydı yok.</Text> : (data.incomes || []).map(i => <View key={i.id} style={styles.listRow}><View style={{ flex: 1 }}><Text style={styles.apartmentName}>{i.title}</Text><Text style={styles.muted}>{i.date}</Text><View style={styles.rowActions}><TouchableOpacity style={styles.editButton} onPress={() => openEditIncome(i)}><Text style={styles.editButtonText}>Düzenle</Text></TouchableOpacity><TouchableOpacity style={styles.deleteButton} onPress={() => deleteIncome(i)}><Text style={styles.deleteButtonText}>Sil</Text></TouchableOpacity></View></View><Text style={styles.due}>{money(i.amount)}</Text></View>)}</View>
            <View style={styles.panel}><Text style={styles.panelTitle}>Yeni gider</Text><TextInput style={styles.input} placeholder="Gider adı (örn. temizlik)" value={expenseTitle} onChangeText={setExpenseTitle} /><TextInput style={styles.input} placeholder="Tutar (TL)" keyboardType="decimal-pad" value={expenseAmount} onChangeText={setExpenseAmount} /><Text style={styles.fieldLabel}>Gider kategorisi</Text><View style={styles.categoryWrap}>{expenseCategories.map(category => <TouchableOpacity key={category} style={[styles.categoryChip, expenseCategory === category && styles.categoryChipActive]} onPress={() => setExpenseCategory(category)}><Text style={[styles.categoryText, expenseCategory === category && styles.categoryTextActive]}>{category}</Text></TouchableOpacity>)}</View><TouchableOpacity style={styles.primaryButton} onPress={addExpense}><Text style={styles.primaryButtonText}>Gideri kaydet</Text></TouchableOpacity></View>
      <View style={styles.panel}><Text style={styles.panelTitle}>Kasa defteri</Text><Text style={styles.muted}>Bütün kayıtlı para girişleri ve çıkışları, tarihe göre sıralanır.</Text>{[
        ...data.payments.map(p => ({ id: "p-" + p.id, date: p.date, title: "Daire " + String(p.apartmentId).padStart(2, "0") + " aidat tahsilatı", amount: p.amount, income: true })),
        ...(data.incomes || []).map(i => ({ id: "i-" + i.id, date: i.date, title: i.title, amount: i.amount, income: true })),
        ...data.expenses.map(e => ({ id: "e-" + e.id, date: e.date, title: e.title, amount: e.amount, income: false }))
      ].sort((a, b) => b.date.localeCompare(a.date)).map(item => <View key={item.id} style={styles.listRow}><View style={{ flex: 1 }}><Text style={styles.apartmentName}>{item.title}</Text><Text style={styles.muted}>{item.date}</Text></View><Text style={[styles.ledgerAmount, { color: item.income ? "#166534" : "#b91c1c" }]}>{item.income ? "+" : "−"}{money(item.amount)}</Text></View>)}</View>
      <View style={styles.panel}><Text style={styles.panelTitle}>Gider geçmişi</Text>{data.expenses.length === 0 ? <Text style={styles.muted}>Henüz gider kaydı yok.</Text> : data.expenses.map(e => <View key={e.id} style={styles.listRow}><View style={{ flex: 1 }}><Text style={styles.apartmentName}>{e.title}</Text><Text style={styles.muted}>{e.date} · {e.category || "Diğer"}</Text><View style={styles.rowActions}><TouchableOpacity style={styles.editButton} onPress={() => openEditExpense(e)}><Text style={styles.editButtonText}>Düzenle</Text></TouchableOpacity><TouchableOpacity style={styles.deleteButton} onPress={() => deleteExpense(e)}><Text style={styles.deleteButtonText}>Sil</Text></TouchableOpacity></View></View><Text style={styles.due}>{money(e.amount)}</Text></View>)}</View>
    </ScrollView>}
    {tab === "settings" && <ScrollView contentContainerStyle={styles.content}>{header("Ayarlar", "Aidat tutarı ve geçerlilik dönemi")}
      <View style={styles.panel}><Text style={styles.panelTitle}>Açılış kasa bakiyesi</Text><Text style={styles.muted}>Uygulamayı kullanmaya başladığında kasada bulunan mevcut tutarı gir.</Text><TextInput style={styles.input} value={openingBalanceInput} onChangeText={setOpeningBalanceInput} keyboardType="decimal-pad" placeholder="Örn. 5000" /><TouchableOpacity style={styles.primaryButton} onPress={saveOpeningBalance}><Text style={styles.primaryButtonText}>Açılış bakiyesini kaydet</Text></TouchableOpacity></View>
      <View style={styles.panel}><Text style={styles.panelTitle}>Aidat tutarını değiştir</Text><Text style={styles.muted}>Seçilen başlangıç ayından itibaren uygulanır; önceki ayların aidatı korunur.</Text><Text style={styles.fieldLabel}>Yeni aylık aidat (TL)</Text><TextInput style={styles.input} value={duesInput} onChangeText={setDuesInput} keyboardType="decimal-pad" placeholder="Örn. 750" /><Text style={styles.fieldLabel}>Başlangıç ayı (YYYY-AA)</Text><TextInput style={styles.input} value={duesMonthInput} onChangeText={setDuesMonthInput} placeholder="2026-11" autoCapitalize="none" /><TouchableOpacity style={styles.primaryButton} onPress={saveDues}><Text style={styles.primaryButtonText}>Aidat değişikliğini kaydet</Text></TouchableOpacity></View>
      <View style={styles.panel}><Text style={styles.panelTitle}>Aidat geçmişi</Text>{Object.keys(data.duesByMonth).sort().map(m => <View style={styles.listRow} key={m}><Text style={styles.apartmentName}>{monthLabel(m)} itibarıyla</Text><Text style={styles.due}>{money(data.duesByMonth[m])}</Text></View>)}</View>
      <View style={styles.panel}><Text style={styles.panelTitle}>Uygulama bilgisi</Text><Text style={styles.muted}>• 20 daire tanımlıdır.</Text><Text style={styles.muted}>• Ödemeler ay bazında kaydedilir.</Text><Text style={styles.muted}>• Aidat değişikliği geçmiş ayların tutarını değiştirmez.</Text></View>
    </ScrollView>}
    {paymentApartment && <View style={styles.modalShade}><View style={styles.modalCard}><Text style={styles.panelTitle}>Daire {String(paymentApartment.id).padStart(2, "0")} · Ödeme ekle</Text><Text style={styles.muted}>Dönem: {monthLabel(selectedMonth)}</Text><Text style={styles.muted}>Bu ay şimdiye kadar: {money(paymentsFor(paymentApartment.id, selectedMonth))}</Text><TextInput style={styles.input} placeholder="Ödeme tutarı (TL)" keyboardType="decimal-pad" value={paymentAmount} onChangeText={setPaymentAmount} autoFocus /><TouchableOpacity style={styles.primaryButton} onPress={addPayment}><Text style={styles.primaryButtonText}>Ödemeyi kaydet</Text></TouchableOpacity><TouchableOpacity style={styles.cancelButton} onPress={() => setPaymentApartment(null)}><Text style={styles.cancelButtonText}>Vazgeç</Text></TouchableOpacity></View></View>}
    {statementApartment && <View style={styles.modalShade}><View style={[styles.modalCard, styles.statementModal]}><Text style={styles.panelTitle}>Daire {String(statementApartment.id).padStart(2, "0")} · Hesap ekstresi</Text><Text style={styles.muted}>{statementApartment.resident.trim() || "Daire sakini belirtilmemiş"} · {monthLabel(selectedMonth)} dönemine kadar</Text><ScrollView style={styles.statementScroll} nestedScrollEnabled>{monthsBetween(data.startMonth, selectedMonth).map(m => { const due = getDues(m); const paid = paymentsFor(statementApartment.id, m); const monthlyBalance = balanceFor(statementApartment.id, m); return <View key={m} style={styles.statementRow}><View style={{ flex: 1 }}><Text style={styles.apartmentName}>{monthLabel(m)}</Text><Text style={styles.muted}>Aidat: {money(due)} · Ödeme: {money(paid)}</Text><Text style={styles.muted}>Dönem sonu borç: {money(monthlyBalance.debt)}{monthlyBalance.credit > 0 ? " · Alacak: " + money(monthlyBalance.credit) : ""}</Text></View><Text style={[styles.statementStatus, { color: monthlyBalance.debt === 0 ? "#166534" : "#b45309" }]}>{monthlyBalance.debt === 0 ? "Kapandı" : "Borçlu"}</Text></View>; })}</ScrollView><TouchableOpacity style={styles.primaryButton} onPress={() => setStatementApartment(null)}><Text style={styles.primaryButtonText}>Ekstreyi kapat</Text></TouchableOpacity></View></View>}
    {editingIncome && <View style={styles.modalShade}><View style={styles.modalCard}><Text style={styles.panelTitle}>Gelir kaydını düzenle</Text><Text style={styles.fieldLabel}>Gelir açıklaması</Text><TextInput style={styles.input} value={editIncomeTitle} onChangeText={setEditIncomeTitle} /><Text style={styles.fieldLabel}>Tutar (TL)</Text><TextInput style={styles.input} keyboardType="decimal-pad" value={editIncomeAmount} onChangeText={setEditIncomeAmount} /><Text style={styles.fieldLabel}>Tarih (YYYY-AA-GG)</Text><TextInput style={styles.input} value={editIncomeDate} onChangeText={setEditIncomeDate} placeholder="2026-10-15" /><TouchableOpacity style={styles.primaryButton} onPress={saveEditedIncome}><Text style={styles.primaryButtonText}>Değişiklikleri kaydet</Text></TouchableOpacity><TouchableOpacity style={styles.cancelButton} onPress={() => setEditingIncome(null)}><Text style={styles.cancelButtonText}>Vazgeç</Text></TouchableOpacity></View></View>}
    {editingExpense && <View style={styles.modalShade}><View style={styles.modalCard}><Text style={styles.panelTitle}>Gider kaydını düzenle</Text><Text style={styles.fieldLabel}>Gider açıklaması</Text><TextInput style={styles.input} value={editExpenseTitle} onChangeText={setEditExpenseTitle} /><Text style={styles.fieldLabel}>Tutar (TL)</Text><TextInput style={styles.input} keyboardType="decimal-pad" value={editExpenseAmount} onChangeText={setEditExpenseAmount} /><Text style={styles.fieldLabel}>Tarih (YYYY-AA-GG)</Text><TextInput style={styles.input} value={editExpenseDate} onChangeText={setEditExpenseDate} placeholder="2026-10-15" /><TouchableOpacity style={styles.primaryButton} onPress={saveEditedExpense}><Text style={styles.primaryButtonText}>Değişiklikleri kaydet</Text></TouchableOpacity><TouchableOpacity style={styles.cancelButton} onPress={() => setEditingExpense(null)}><Text style={styles.cancelButtonText}>Vazgeç</Text></TouchableOpacity></View></View>}
    {editingPayment && <View style={styles.modalShade}><View style={styles.modalCard}><Text style={styles.panelTitle}>Ödeme kaydını düzenle</Text><Text style={styles.muted}>Daire {String(editingPayment.apartmentId).padStart(2, "0")} · {monthLabel(editingPayment.month)}</Text><Text style={styles.fieldLabel}>Ödeme tutarı (TL)</Text><TextInput style={styles.input} keyboardType="decimal-pad" value={editPaymentAmount} onChangeText={setEditPaymentAmount} /><Text style={styles.fieldLabel}>Ödeme tarihi (YYYY-AA-GG)</Text><TextInput style={styles.input} value={editPaymentDate} onChangeText={setEditPaymentDate} placeholder="2026-10-15" autoCapitalize="none" /><TouchableOpacity style={styles.primaryButton} onPress={saveEditedPayment}><Text style={styles.primaryButtonText}>Değişiklikleri kaydet</Text></TouchableOpacity><TouchableOpacity style={styles.cancelButton} onPress={() => setEditingPayment(null)}><Text style={styles.cancelButtonText}>Vazgeç</Text></TouchableOpacity></View></View>}
    <View style={styles.nav}><NavItem label="Anasayfa" icon="⌂" active={tab === "home"} onPress={() => setTab("home")} /><NavItem label="Daireler" icon="▦" active={tab === "apartments"} onPress={() => setTab("apartments")} /><NavItem label="Giderler" icon="₺" active={tab === "expenses"} onPress={() => setTab("expenses")} /><NavItem label="Ayarlar" icon="⚙" active={tab === "settings"} onPress={() => setTab("settings")} /></View>
  </SafeAreaView>;
}
function Metric({ title, value }: { title: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricTitle}>{title}</Text><Text style={styles.metricValue}>{value}</Text></View>; }
function Action({ title, onPress }: { title: string; onPress: () => void }) { return <TouchableOpacity style={styles.action} onPress={onPress}><Text style={styles.actionText}>{title}</Text><Text style={styles.actionArrow}>›</Text></TouchableOpacity>; }
function NavItem({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) { return <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.navItem, active && styles.navItemActive]} onPress={onPress}><Text style={[styles.navIcon, active && styles.navIconActive]}>{icon}</Text><Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>{active && <View style={styles.navDot} />}</TouchableOpacity>; }
const styles = StyleSheet.create({
 safe: { flex: 1, backgroundColor: "#f4f6f2" }, topSafeSpace: { height: 8, backgroundColor: "#f4f6f2" }, content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 36 },
 header: { backgroundColor: "#123d2a", borderRadius: 22, padding: 21, marginBottom: 14, borderWidth: 1, borderColor: "#24553d", elevation: 3 }, brand: { color: "#d8c58a", fontSize: 11, fontWeight: "900", letterSpacing: 1.8, marginBottom: 12 }, pageTitle: { color: "#fffdf6", fontSize: 25, fontWeight: "900", letterSpacing: -0.4 }, subtitle: { color: "#d3e4d7", fontSize: 13, marginTop: 6, lineHeight: 19 },
 monthPicker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 15, padding: 9, marginBottom: 14, borderWidth: 1, borderColor: "#e0e6dc", elevation: 1 }, monthArrow: { paddingHorizontal: 16, paddingVertical: 4 }, monthArrowText: { fontSize: 27, color: "#166534" }, monthText: { fontSize: 15, color: "#14532d", fontWeight: "800", textTransform: "capitalize" },
 grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }, metric: { width: "48%", flexGrow: 1, backgroundColor: "#fff", borderRadius: 17, padding: 15, minHeight: 100, justifyContent: "space-between", borderWidth: 1, borderColor: "#e2e6dc", elevation: 1 }, metricTitle: { color: "#69766d", fontSize: 12, fontWeight: "600" }, metricValue: { color: "#16452f", fontWeight: "900", fontSize: 18, marginTop: 10 },
 panel: { backgroundColor: "#fff", borderRadius: 18, padding: 17, marginBottom: 14, borderWidth: 1, borderColor: "#e1e6dc", elevation: 1 }, panelTitle: { color: "#183729", fontSize: 16, fontWeight: "900", marginBottom: 12 }, bigNumber: { fontSize: 27, fontWeight: "900", color: "#16452f", marginBottom: 4 }, muted: { color: "#64748b", fontSize: 12, marginTop: 4 }, track: { height: 8, backgroundColor: "#e2e8e2", borderRadius: 9, overflow: "hidden", marginTop: 14 }, progress: { height: 8, backgroundColor: "#16a34a", borderRadius: 9 },
 action: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#edf2ed" }, actionText: { color: "#166534", fontWeight: "700", fontSize: 14 }, actionArrow: { color: "#16a34a", fontSize: 25 },
 apartment: { backgroundColor: "#fff", borderRadius: 17, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: "#e1e6dc", elevation: 1 }, apartmentTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }, apartmentName: { color: "#172b20", fontWeight: "800", fontSize: 15 }, badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, overflow: "hidden", fontSize: 11, fontWeight: "800" }, input: { backgroundColor: "#f8faf7", borderWidth: 1, borderColor: "#dce4d8", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, marginBottom: 10, color: "#183729" }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 }, due: { color: "#166534", fontWeight: "800" }, debtLine: { color: "#475569", fontSize: 12, marginTop: 8 }, statementButton: { backgroundColor: "#eaf2e9", borderRadius: 11, padding: 11, alignItems: "center", marginTop: 12, borderWidth: 1, borderColor: "#cbdcc9" }, statementButtonText: { color: "#174d34", fontWeight: "800" }, statementModal: { maxHeight: "82%" }, statementScroll: { marginTop: 10, marginBottom: 12 }, statementRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#edf2ed", gap: 8 }, statementStatus: { fontSize: 11, fontWeight: "900" }, filterButton: { backgroundColor: "#eaf2e9", borderRadius: 10, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#cbdcc9" }, filterButtonText: { color: "#174d34", fontWeight: "800" }, smallButton: { backgroundColor: "#174d34", borderRadius: 11, padding: 12, alignItems: "center", marginTop: 12 }, smallButtonText: { color: "#fff", fontWeight: "800" }, history: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#edf2ed", paddingTop: 8 }, historyTitle: { color: "#334155", fontWeight: "700", fontSize: 12 },
 paymentHistoryRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#edf2ed" }, paymentAmount: { color: "#166534", fontWeight: "800", marginTop: 2 }, editButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, backgroundColor: "#e0f2fe" }, editButtonText: { color: "#075985", fontSize: 11, fontWeight: "800" }, deleteButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, backgroundColor: "#fee2e2" }, deleteButtonText: { color: "#b91c1c", fontSize: 11, fontWeight: "800" },
 creditLine: { color: "#0369a1", fontSize: 12, fontWeight: "800", marginTop: 7 },
 categoryWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 12 }, categoryChip: { borderWidth: 1, borderColor: "#dce4d8", borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#f8faf7" }, categoryChipActive: { backgroundColor: "#174d34", borderColor: "#174d34" }, categoryText: { color: "#475569", fontSize: 11, fontWeight: "700" }, categoryTextActive: { color: "#fff" }, rowActions: { flexDirection: "row", gap: 8, marginTop: 7 }, ledgerAmount: { fontWeight: "900", fontSize: 13 }, primaryButton: { backgroundColor: "#174d34", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 2, elevation: 1 }, primaryButtonText: { color: "#fff", fontWeight: "800" }, fieldLabel: { color: "#334155", fontSize: 12, fontWeight: "700", marginBottom: 6, marginTop: 8 }, listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#edf2ed" },
 modalShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "center", padding: 20 }, modalCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18, elevation: 8 }, cancelButton: { padding: 12, alignItems: "center", marginTop: 4 }, cancelButtonText: { color: "#64748b", fontWeight: "700" },
 nav: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e1e6dc", paddingTop: 10, paddingBottom: 12, paddingHorizontal: 7, justifyContent: "space-around", alignItems: "center", elevation: 12, minHeight: 76 }, navItem: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 62, marginHorizontal: 3, borderRadius: 14, paddingTop: 7, paddingBottom: 5 }, navItemActive: { backgroundColor: "#eaf2e9" }, navIcon: { fontSize: 23, color: "#879188", fontWeight: "700" }, navIconActive: { color: "#174d34" }, navLabel: { color: "#7b857d", fontSize: 11, fontWeight: "600", marginTop: 4 }, navLabelActive: { color: "#174d34", fontWeight: "900" }, navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#c4a85b", marginTop: 2 }
});