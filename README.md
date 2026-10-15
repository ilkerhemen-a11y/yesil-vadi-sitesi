# Yeşil Vadi Sitesi

20 daireli site için çevrimdışı Android yönetim uygulaması.

## Mevcut ilk sürüm
- 20 dairelik liste ve isteğe bağlı sakin adı
- Ay seçerek aidat dönemleri arasında gezinme
- Daire bazında seçili aya ödeme ekleme ve ödeme hareketlerini görüntüleme
- Dönem bazında beklenen, tahsil edilen ve kalan aidat toplamları
- Seçili aya kadar hesaplanan toplam kalan aidat
- Aidat tutarını belirli bir aydan itibaren değiştirme; önceki dönemlerin tutarını koruma
- Gider kaydı ve gider geçmişi
- AsyncStorage ile cihaz üzerinde yerel saklama

## Başlangıç değerleri
- Daire sayısı: 20
- Başlangıç aylık aidatı: 600 TL
- Tüm daireler için beklenen toplam: 12.000 TL

## Geliştirme
```bash
npm install
npx expo start
```

## Android APK
EAS CLI ile giriş yaptıktan sonra:
```bash
npx eas-cli build --platform android --profile preview
```

## Henüz yapılmayanlar
- Yedekleme ve geri yükleme (şimdilik kapsam dışında bırakıldı)
- Kayıt düzenleme/silme ve ayrıntılı raporlar
- Ödeme fazlasının sonraki aya aktarılması
- Android cihazda gerçek test ve APK üretimi

Not: Bu kod GitHub'a kaydedildi, ancak henüz derlenip cihazda test edilmiş bir APK değildir.