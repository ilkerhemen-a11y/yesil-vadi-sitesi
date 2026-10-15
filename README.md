# Yeşil Vadi Sitesi

20 daireli site için çevrimdışı Android yönetim uygulaması.

## İlk geliştirme sürümü
- 20 daire için başlangıç listesi
- Daire bazında sakin adı alanı
- Daireye ödeme eklemek için Android uyumlu form
- Aidat tahsilatı özeti ve kalan tutar görünümü
- Gider kaydı ve gider geçmişi
- Aylık aidat tutarı ayarı
- Verileri cihazda AsyncStorage ile saklama

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

## APK öncesi tamamlanması gerekenler
Bu depo ilk uygulama iskeletidir; henüz test edilmiş veya yayımlanmış APK değildir. Ay bazında aidat geçmişi ve borç devri, ödeme hareketleri geçmişi, veri yedekleme/geri yükleme, giriş/doğrulama ve cihaz testleri tamamlanmalıdır. Aidat değişikliğinin geçmiş ay kayıtlarını etkilememesi özellikle sağlanmalıdır.