export const MOCK_TEMPLATES = {
  tempConverter: {
    title: 'Fahrenheit ➔ Celsius Dönüştürücü',
    prompt: 'Fahrenheit girilen değeri dereceye çeviren bir uygulama yap',
    layout: {
      type: 'Card',
      props: { backgroundColor: 'card', borderRadius: 'lg', padding: 20 },
      children: [
        {
          type: 'Text',
          props: {
            text: 'Derece Dönüştürücü',
            fontSize: 'lg',
            fontWeight: 'bold',
            color: 'text',
            textAlign: 'left',
          },
        },
        {
          type: 'Text',
          props: {
            text: 'Fahrenheit cinsinden sıcaklık değerini girin:',
            color: 'textMuted',
            fontSize: 'sm',
          },
        },
        {
          type: 'TextInput',
          props: {
            placeholder: 'Örn: 98.6',
            bindState: 'fahrenheitInput',
            keyboardType: 'numeric',
          },
        },
        {
          type: 'Button',
          props: {
            label: 'Celsius\'a Çevir',
            iconName: 'calculator-outline',
            color: 'primary',
            variant: 'solid',
            onPressAction: {
              functionName: 'CONVERT_FAHRENHEIT_TO_CELSIUS',
              inputKey: 'fahrenheitInput',
              outputKey: 'celsiusOutput',
            },
          },
        },
        {
          type: 'Card',
          props: { backgroundColor: 'background', borderRadius: 'md', padding: 12 },
          children: [
            {
              type: 'Text',
              props: {
                text: 'Dönüştürülen Değer:',
                color: 'textMuted',
                fontSize: 'sm',
              },
            },
            {
              type: 'Text',
              props: {
                text: 'Henüz hesaplanmadı',
                bindState: 'celsiusOutput',
                fontSize: 'lg',
                fontWeight: 'bold',
                color: 'success',
              },
            },
          ],
        },
      ],
    },
  },

  cryptoTracker: {
    title: 'Kripto Para Canlı Fiyat Takipçisi',
    prompt: 'Kripto para sembolünü girince canlı USDT fiyatını gösteren uygulama yap',
    layout: {
      type: 'Card',
      props: { backgroundColor: 'card', borderRadius: 'lg', padding: 20 },
      children: [
        {
          type: 'Text',
          props: {
            text: 'Binance Canlı Fiyat',
            fontSize: 'lg',
            fontWeight: 'bold',
            color: 'text',
            textAlign: 'left',
          },
        },
        {
          type: 'Text',
          props: {
            text: 'USDT fiyatını görmek istediğiniz sembolü girin (örn: BTC, ETH, SOL):',
            color: 'textMuted',
            fontSize: 'sm',
          },
        },
        {
          type: 'TextInput',
          props: {
            placeholder: 'Örn: BTC veya ETH',
            bindState: 'cryptoSymbol',
          },
        },
        {
          type: 'Button',
          props: {
            label: 'Canlı Değeri Sorgula',
            iconName: 'trending-up-outline',
            color: 'success',
            variant: 'solid',
            onPressAction: {
              functionName: 'FETCH_CRYPTO_PRICE',
              inputKey: 'cryptoSymbol',
              outputKey: 'cryptoPrice',
            },
          },
        },
        {
          type: 'Card',
          props: { backgroundColor: 'background', borderRadius: 'md', padding: 12 },
          children: [
            {
              type: 'Text',
              props: {
                text: 'Piyasa Fiyatı:',
                color: 'textMuted',
                fontSize: 'sm',
              },
            },
            {
              type: 'Text',
              props: {
                text: 'Sorgulanmadı',
                bindState: 'cryptoPrice',
                fontSize: 'lg',
                fontWeight: 'bold',
                color: 'text',
              },
            },
          ],
        },
      ],
    },
  },

  passwordGenerator: {
    title: 'Güvenli Şifre Oluşturucu',
    prompt: 'İstediğimiz uzunlukta güvenli şifreler oluşturan bir şifre üretici yap',
    layout: {
      type: 'Card',
      props: { backgroundColor: 'card', borderRadius: 'lg', padding: 20 },
      children: [
        {
          type: 'Text',
          props: {
            text: 'Şifre Üretici',
            fontSize: 'lg',
            fontWeight: 'bold',
            color: 'text',
            textAlign: 'left',
          },
        },
        {
          type: 'Text',
          props: {
            text: 'Şifre uzunluğunu girin (örn: 12, 16):',
            color: 'textMuted',
            fontSize: 'sm',
          },
        },
        {
          type: 'TextInput',
          props: {
            placeholder: 'Varsayılan: 8',
            bindState: 'pwLength',
            keyboardType: 'numeric',
          },
        },
        {
          type: 'Button',
          props: {
            label: 'Rastgele Şifre Üret',
            iconName: 'key-outline',
            color: 'error',
            variant: 'solid',
            onPressAction: {
              functionName: 'GENERATE_PASSWORD',
              inputKey: 'pwLength',
              outputKey: 'generatedPassword',
            },
          },
        },
        {
          type: 'Card',
          props: { backgroundColor: 'background', borderRadius: 'md', padding: 12 },
          children: [
            {
              type: 'Text',
              props: {
                text: 'Üretilen Şifre:',
                color: 'textMuted',
                fontSize: 'sm',
              },
            },
            {
              type: 'Text',
              props: {
                text: 'Üretilmedi',
                bindState: 'generatedPassword',
                fontSize: 'lg',
                fontWeight: 'bold',
                color: 'error',
              },
            },
          ],
        },
      ],
    },
  },

  bmiCalculator: {
    title: 'Sağlık & VKİ Takipçisi (Gelişmiş)',
    prompt: 'Kilo ve boy ile Vücut Kitle İndeksi hesaplayan modern bir sağlık takipçisi yap',
    layout: {
      type: 'Container',
      props: { padding: 0, gap: 16 },
      children: [
        {
          type: 'Text',
          props: {
            text: 'Sağlık & VKİ Takibi',
            fontSize: 'xl',
            fontWeight: 'bold',
            color: 'text',
          },
        },
        {
          type: 'Card',
          props: { padding: 20, gap: 14, backgroundColor: 'card', borderRadius: 'lg' },
          children: [
            { type: 'Text', props: { text: 'Ağırlık (kg)', fontSize: 'sm', color: 'textMuted' } },
            { type: 'TextInput', props: { placeholder: 'örn: 70', bindState: 'weight', keyboardType: 'numeric' } },
            { type: 'Text', props: { text: 'Boy (cm)', fontSize: 'sm', color: 'textMuted' } },
            { type: 'TextInput', props: { placeholder: 'örn: 175', bindState: 'height', keyboardType: 'numeric' } },
            {
              type: 'Button',
              props: {
                label: 'Hesapla ve Analiz Et',
                iconName: 'calculator-outline',
                color: 'primary',
                radius: 'lg',
                onPressAction: {
                  functionName: 'RUN_SCRIPT',
                  script: "const w = parseFloat(weight) || 0; const h = (parseFloat(height) || 0) / 100; if (w <= 0 || h <= 0) return '0'; const bmi = w / (h * h); return bmi.toFixed(1);",
                  outputKey: 'bmiVal'
                }
              }
            }
          ]
        },
        {
          type: 'Card',
          props: { padding: 20, gap: 12, backgroundColor: 'card', borderRadius: 'lg' },
          children: [
            {
              type: 'Row',
              props: { justifyContent: 'space-between' },
              children: [
                { type: 'Text', props: { text: 'Vücut Kitle İndeksi', fontSize: 'md', fontWeight: 'semibold', color: 'text' } },
                { type: 'Badge', props: { text: 'Analiz', color: 'success' } }
              ]
            },
            { type: 'Divider', props: {} },
            {
              type: 'Row',
              props: { justifyContent: 'space-between' },
              children: [
                { type: 'Text', props: { text: 'VKİ Skorunuz:', fontSize: 'md', color: 'textMuted' } },
                { type: 'Text', props: { bindState: 'bmiVal', text: 'Hesaplanmadı', fontSize: 'lg', fontWeight: 'bold', color: 'primary' } }
              ]
            },
            { type: 'Spacer', props: { height: 8 } },
            { type: 'ProgressBar', props: { bindState: 'bmiVal', max: 40, color: 'primary', height: 8 } }
          ]
        }
      ]
    }
  }
};
