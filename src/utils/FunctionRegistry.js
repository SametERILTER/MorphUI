export const FUNCTION_REGISTRY = {
  CONVERT_FAHRENHEIT: (val) => {
    if (!val || isNaN(val)) return 'Geçersiz değer';
    const celsius = ((parseFloat(val) - 32) * 5) / 9;
    return celsius.toFixed(1) + ' °C';
  },

  CONVERT_CELSIUS: (val) => {
    if (!val || isNaN(val)) return 'Geçersiz değer';
    const fahrenheit = (parseFloat(val) * 9) / 5 + 32;
    return fahrenheit.toFixed(1) + ' °F';
  },

  UPPERCASE: (text) => {
    if (!text) return '';
    return text.toString().toUpperCase();
  },

  LOWERCASE: (text) => {
    if (!text) return '';
    return text.toString().toLowerCase();
  },

  EXECUTE_API: async (inputData, action, stateStore) => {
    if (!action || !action.apiUrl) return 'Hata: API adresi tanımlanmamış.';

    let url = action.apiUrl;
    const matches = url.match(/\{([^}]+)\}/g);
    if (matches) {
      matches.forEach(match => {
        const key = match.slice(1, -1);
        const val = stateStore[key] !== undefined ? stateStore[key] : '';
        url = url.replace(match, encodeURIComponent(val));
      });
    }

    try {
      const method = action.method || 'GET';
      const res = await fetch(url, { method });
      if (!res.ok) throw new Error(`API Hatası (Kod: ${res.status})`);
      const data = await res.json();

      let result = data;
      if (action.extractPath) {
        const pathParts = action.extractPath.split('.');
        result = pathParts.reduce((acc, part) => acc?.[part], data);
      }
      return result !== undefined ? String(result) : JSON.stringify(data);
    } catch (e) {
      return `Hata: ${e.message}`;
    }
  },

  RUN_SCRIPT: (inputData, action, stateStore, updateState) => {
    if (!action || !action.script) return 'Hata: Çalıştırılacak kod bulunamadı.';

    const scriptState = { ...stateStore };

    const setFn = (key, value) => {
      scriptState[key] = value;
      if (updateState) {
        updateState(key, value);
      }
    };

    const keys = Object.keys(stateStore);
    const values = Object.values(stateStore);

    const shadows = ['global', 'globalThis', 'fetch', 'XMLHttpRequest', 'require', 'window', 'document'];
    const shadowValues = shadows.map(() => undefined);

    const fnKeys = [...shadows, 'state', 'updateState', 'set', 'itemIndex', 'arrayKey', ...keys];
    const fnValues = [...shadowValues, scriptState, setFn, setFn, action.itemIndex ?? -1, action.arrayKey ?? '', ...values];

    try {
      const run = new Function(...fnKeys, `"use strict"; ${action.script}`);
      const result = run(...fnValues);

      Object.entries(scriptState).forEach(([k, v]) => {
        if (stateStore[k] !== v) {
          if (updateState) {
            updateState(k, v);
          }
        }
      });

      return result !== undefined ? String(result) : '';
    } catch (e) {
      return `Hata: ${e.message}`;
    }
  },


  CONVERT_FAHRENHEIT_TO_CELSIUS: (val) => {
    if (!val || isNaN(val)) return 'Geçersiz değer';
    const celsius = ((parseFloat(val) - 32) * 5) / 9;
    return celsius.toFixed(1) + ' °C';
  },

  CONVERT_CELSIUS_TO_FAHRENHEIT: (val) => {
    if (!val || isNaN(val)) return 'Geçersiz değer';
    const fahrenheit = (parseFloat(val) * 9) / 5 + 32;
    return fahrenheit.toFixed(1) + ' °F';
  },

  CALCULATE_DISCOUNT: (input) => {
    if (!input) return 'Girdi bekleniyor';
    const parts = input.split(',');
    const price = parseFloat(parts[0]);
    const rate = parseFloat(parts[1] || '0');
    if (isNaN(price) || isNaN(rate)) return 'Geçersiz sayılar';
    const discountAmount = price * (rate / 100);
    const finalPrice = price - discountAmount;
    return `İndirimli Fiyat: ${finalPrice.toFixed(2)} TL (Tasfiye: ${discountAmount.toFixed(2)} TL)`;
  },

  ADD_NUMBERS: (input) => {
    if (!input) return '0';
    const parts = input.split(',');
    const sum = parts.reduce((acc, part) => acc + (parseFloat(part) || 0), 0);
    return sum.toString();
  },


  REVERSE_TEXT: (text) => {
    if (!text) return '';
    return text.toString().split('').reverse().join('');
  },

  UPPERCASE_TEXT: (text) => {
    if (!text) return '';
    return text.toString().toUpperCase();
  },

  LOWERCASE_TEXT: (text) => {
    if (!text) return '';
    return text.toString().toLowerCase();
  },

  GENERATE_PASSWORD: (lengthVal) => {
    const length = parseInt(lengthVal) || 8;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let retVal = '';
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  },


  FETCH_CRYPTO_PRICE: async (symbol) => {
    try {
      const sym = (symbol || 'BTC').toString().trim().toUpperCase();
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}USDT`);
      if (!res.ok) throw new Error('API hatası');
      const data = await res.json();
      const price = parseFloat(data.price);
      return `${sym}/USDT: $${price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } catch (e) {
      return `Fiyat alınamadı (Sembolü kontrol edin, örn: BTC, ETH)`;
    }
  },

  FETCH_WEATHER: async (city) => {
    try {
      const cityName = (city || 'Istanbul').toString().trim().toLowerCase();

      const coords = {
        istanbul: { lat: 41.0082, lon: 28.9784, name: 'İstanbul' },
        ankara: { lat: 39.9334, lon: 32.8597, name: 'Ankara' },
        izmir: { lat: 38.4192, lon: 27.1287, name: 'İzmir' },
        london: { lat: 51.5074, lon: -0.1278, name: 'Londra' },
        newyork: { lat: 40.7128, lon: -74.006, name: 'New York' },
      };

      const cityKey = cityName.replace(/[^a-z]/g, '');
      const coord = coords[cityKey] || coords.istanbul;

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lon}&current=temperature_2m,relative_humidity_2m,weather_code`
      );
      if (!res.ok) throw new Error('Hava durumu API hatası');
      const data = await res.json();
      const temp = data.current.temperature_2m;
      const humidity = data.current.relative_humidity_2m;
      return `${coord.name}: ${temp}°C, Nem: %${humidity}`;
    } catch (e) {
      return 'Hava durumu alınamadı';
    }
  },


  CALCULATE_BMI: (input) => {
    if (!input) return 'Girdi bekleniyor (kilo,boy örn: 70,1.75)';
    const parts = input.split(',');
    const weight = parseFloat(parts[0]);
    const height = parseFloat(parts[1]);
    if (isNaN(weight) || isNaN(height) || height <= 0) return 'Geçersiz değerler (örn: 70,1.75)';
    const bmi = weight / (height * height);
    let category = '';
    if (bmi < 18.5) category = 'Zayıf';
    else if (bmi < 25) category = 'Normal';
    else if (bmi < 30) category = 'Fazla Kilolu';
    else category = 'Obez';
    return `VKİ: ${bmi.toFixed(1)} (${category})`;
  },

  CALCULATE_LOAN_EMI: (input) => {
    if (!input) return 'Girdi bekleniyor (tutar,yıllık_faiz,yıl örn: 10000,12,3)';
    const parts = input.split(',');
    const principal = parseFloat(parts[0]);
    const yearlyRate = parseFloat(parts[1]);
    const years = parseFloat(parts[2]);
    if (isNaN(principal) || isNaN(yearlyRate) || isNaN(years) || years <= 0) return 'Geçersiz değerler';

    const monthlyRate = (yearlyRate / 100) / 12;
    const numberOfPayments = years * 12;
    if (monthlyRate === 0) return `Aylık Ödeme: ${(principal / numberOfPayments).toFixed(2)} TL`;

    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    const totalPayment = emi * numberOfPayments;
    const totalInterest = totalPayment - principal;
    return `Aylık Taksit: ${emi.toFixed(2)} TL | Toplam Ödeme: ${totalPayment.toFixed(2)} TL | Faiz: ${totalInterest.toFixed(2)} TL`;
  },

  CONVERT_CURRENCY: async (input) => {
    if (!input) return 'Girdi bekleniyor (miktar,kaynak,hedef örn: 100,USD,TRY)';
    const parts = input.split(',');
    const amount = parseFloat(parts[0]);
    const from = (parts[1] || 'USD').trim().toUpperCase();
    const to = (parts[2] || 'TRY').trim().toUpperCase();
    if (isNaN(amount)) return 'Geçersiz miktar';

    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
      if (!res.ok) throw new Error('API hatası');
      const data = await res.json();
      const rate = data.rates[to];
      if (!rate) return `Uyumsuz kur: ${to}`;
      const result = amount * rate;
      return `${amount} ${from} = ${result.toFixed(2)} ${to} (Kur: ${rate.toFixed(4)})`;
    } catch (e) {
      const fallbackRates = { USD: { TRY: 34.2, EUR: 0.92 }, EUR: { TRY: 37.1, USD: 1.09 }, TRY: { USD: 0.029, EUR: 0.027 } };
      const rate = fallbackRates[from]?.[to];
      if (rate) {
        return `[Çevrimdışı Kur] ${amount} ${from} = ${(amount * rate).toFixed(2)} ${to}`;
      }
      return 'Döviz bilgisi alınamadı (Çevrimiçi olun veya USD/EUR/TRY deneyin)';
    }
  },


  GENERATE_QR_URL: (text) => {
    if (!text) return 'Metin bekleniyor';
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(text.toString().trim())}`;
  },

  FETCH_DOG_IMAGE: async () => {
    try {
      const res = await fetch('https://dog.ceo/api/breeds/image/random');
      if (!res.ok) throw new Error('API Hatası');
      const data = await res.json();
      return data.message;
    } catch (e) {
      return 'https://images.dog.ceo/breeds/terrier-irish/n02093991_403.jpg';
    }
  },

  FETCH_CAT_FACT: async () => {
    try {
      const res = await fetch('https://catfact.ninja/fact');
      if (!res.ok) throw new Error('API Hatası');
      const data = await res.json();
      return data.fact;
    } catch (e) {
      return 'Kediler hayatlarının yaklaşık %70\'ini uyuyarak geçirir.';
    }
  },

  FETCH_JOKE: async () => {
    try {
      const res = await fetch('https://v2.jokeapi.dev/joke/Any?safe-mode&type=single');
      if (!res.ok) throw new Error('API Hatası');
      const data = await res.json();
      return data.joke;
    } catch (e) {
      return 'Bir yazılımcı için en büyük yalan: "Burası kalsın, yarın düzeltirim."';
    }
  },


  CALCULATE_AGE: (birthdate) => {
    if (!birthdate) return 'Doğum tarihi bekleniyor (YYYY-MM-DD)';
    const dob = new Date(birthdate.toString().trim());
    if (isNaN(dob.getTime())) return 'Geçersiz tarih formatı (örn: 1995-12-15)';
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    const years = Math.abs(ageDt.getUTCFullYear() - 1970);
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return `Yaş: ${years} | Toplam Gün: ${days.toLocaleString()} gün`;
  },

  ROLL_DICE: (sidesVal) => {
    const sides = parseInt(sidesVal) || 6;
    const roll = Math.floor(Math.random() * sides) + 1;
    return `Zar Sonucu (${sides} yüzlü): ${roll}`;
  },

  FLIP_COIN: () => {
    const result = Math.random() < 0.5 ? 'Yazı' : 'Tura';
    return `Yazı-Tura Sonucu: ${result}`;
  },

  WORD_COUNT: (text) => {
    if (!text) return 'Karakter: 0 | Kelime: 0 | Cümle: 0';
    const charCount = text.length;
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    return `Karakter: ${charCount} | Kelime: ${wordCount} | Cümle: ${sentenceCount}`;
  },

  FETCH_IP_INFO: async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('API Hatası');
      const data = await res.json();
      return `IP: ${data.ip} | Konum: ${data.city}, ${data.country_name} | Sağlayıcı: ${data.org}`;
    } catch (e) {
      return 'IP ve Konum bilgileri alınamadı.';
    }
  },
};
