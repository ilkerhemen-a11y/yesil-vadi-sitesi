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
  const [paymentApartment, setPaymentApartment] = useState<Apartment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
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

  const addPayment = () => {
    const amount = Number(paymentAmount.replace(",", "."));
    if (!paymentApartment || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Geçersiz tutar", "Sıfırdan büyük bir ödeme tutarı girin."); return;
    }
    updateApartment(paymentApartment.id, { paid: paymentApartment.paid + amount });
    setPaymentApartment(null);
    setPaymentAmount("");
    Alert.alert("Ödeme kaydedildi", "Ödeme daire bakiyesine eklendi.");
  };;