# Yeşil Vadi Sitesi

20 daireli site için çevrimdışı Android yönetim uygulaması.

## Mevcut geliştirme sürümü
- 20 dairelik liste ve isteğe bağlı sakin adı
- Ay seçerek aidat dönemleri arasında gezinme
- Daire bazında seçili aya ödeme ekleme
- Ödeme hareketlerini görüntüleme, tutar/tarih düzenleme ve kaydı silme
- Dönem bazında beklenen, tahsil edilen ve kalan aidat toplamları
- Önceki dönemlerden devreden borçların kümülatif hesabı
- Toplam fazla ödeme/alacak bakiyesi
- Ödemelerin birikmiş eski borçları önce kapatacak şekilde bakiye hesabı
- Seçili ay için tahsilat, gider ve net nakit akışı raporu
- Seçili aya kadar kalan aidat borçlarının özeti
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

## Sonraki işler
- Borç devri ve fazla ödeme hesaplarının farklı senaryolarla test edilmesi
- Gider kayıtlarını düzenleme/silme
- Aylık gelir-gider raporları
- Yedekleme/geri yükleme (şimdilik bekletiliyor)
- Android cihazda gerçek test ve APK üretimi

Not: Kod GitHub'a kaydedilmiştir ancak henüz derlenmiş veya cihazda test edilmiş bir APK değildir.