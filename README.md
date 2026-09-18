# MorphUI, a Generative UI App

MorphUI is an experimental Generative UI (GenUI) runtime engine and declarative component renderer built for React Native and Expo. It translates natural language instructions into fully interactive, stateful, and animated mobile user interfaces in real time using large language models.

Unlike traditional static UI frameworks or code generation tools that write raw JSX files, MorphUI synthesizes a structured Abstract Syntax Tree (AST) JSON payload. This tree is dynamically parsed, validated, auto-healed, and rendered by a native component engine on the client device.

---

## Architecture Overview

MorphUI combines dynamic layout rendering, a centralized reactive state store, and a sandboxed client-side execution environment.

```
+-------------------------------------------------------------+
|                     Natural Language Prompt                 |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|             Google Gemini Generative AI Engine              |
|        (Structured JSON Schema Output with Gemini 1.5)      |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|          Schema Normalizer & Auto-Healing Pipeline          |
|      - Layout Node Resolution & Type Inference              |
|      - State Binding Verification & Fallback Repair         |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               DynamicRenderer (Recursive Tree)              |
|       - ComponentMap Resolution (40+ Native Primitives)     |
|       - Staggered Entry Transitions (Reanimated 4)          |
+-------------------------------------------------------------+
            |                                     |
            v                                     v
+-----------------------+             +-----------------------+
|  Reactive State Store | <=========> | Sandboxed Interpreter |
|  (EngineContext)      |             | (FunctionRegistry /   |
|  - Key-Value Store    |             |  RUN_SCRIPT Sandbox)  |
|  - Bidirectional Bind |             | - Math & Calculations |
|  - Async Persistence  |             | - Remote API Calls    |
+-----------------------+             +-----------------------+
```

---

## Core Systems

### 1. Declarative Generative Schema

The generative engine returns a standardized JSON structure containing the initial state store and the hierarchical component tree.

#### Example Schema:
```json
{
  "state": {
    "billAmount": "100",
    "tipPercent": "15",
    "totalTip": "15.00",
    "totalBill": "115.00"
  },
  "layout": {
    "type": "Container",
    "props": {
      "style": { "padding": 16, "gap": 12 }
    },
    "children": [
      {
        "type": "Card",
        "props": {
          "title": "Tip & Split Calculator",
          "subtitle": "Calculate tip and split total instantly",
          "variant": "glass"
        },
        "children": [
          {
            "type": "Input",
            "props": {
              "label": "Bill Amount ($)",
              "bindState": "billAmount",
              "keyboardType": "numeric",
              "placeholder": "Enter amount..."
            }
          },
          {
            "type": "Slider",
            "props": {
              "label": "Tip Percentage",
              "bindState": "tipPercent",
              "min": 0,
              "max": 30,
              "step": 1
            }
          },
          {
            "type": "Button",
            "props": {
              "title": "Calculate",
              "variant": "primary",
              "action": {
                "functionName": "RUN_SCRIPT",
                "script": "const b = parseFloat(state.billAmount) || 0; const t = parseFloat(state.tipPercent) || 0; const tip = (b * t) / 100; state.totalTip = tip.toFixed(2); state.totalBill = (b + tip).toFixed(2);",
                "successMessage": "Calculated successfully"
              }
            }
          }
        ]
      },
      {
        "type": "StatCard",
        "props": {
          "title": "Total Due",
          "value": "{totalBill} $",
          "subtitle": "Tip: {totalTip} $",
          "color": "#6366f1"
        }
      }
    ]
  }
}
```

---

### 2. Reactive State & Bidirectional Binding

Components bind directly to the central engine state using `bindState`. When an input value changes or a button triggers an action, all text nodes with interpolation syntax (`{stateKey}`) or components linked to that key update automatically.

```javascript
const resolveStateValue = (state, path) => {
  if (!path || !state) return '';
  if (path.includes('.')) {
    return path.split('.').reduce((acc, part) => acc && acc[part], state);
  }
  return state[path];
};
```

Interpolation resolution handles dynamic strings seamlessly:
```javascript
const resolveInterpolation = (text, state) => {
  if (typeof text !== 'string') return text;
  return text.replace(/\{([^}]+)\}/g, (_, key) => {
    const val = resolveStateValue(state, key.trim());
    return val !== undefined ? String(val) : '';
  });
};
```

---

### 3. Sandboxed Script Execution & Action Pipeline

For actions requiring logical computations, multi-step workflows, or remote API queries, MorphUI runs an isolated JavaScript evaluator with shadowed globals to protect against unauthorized environment access.

```javascript
RUN_SCRIPT: (inputData, action, stateStore, updateState) => {
  if (!action || !action.script) return 'Error: No script defined.';
  
  const scriptState = { ...stateStore };
  const setFn = (key, value) => {
    scriptState[key] = value;
    if (updateState) updateState(key, value);
  };

  const keys = Object.keys(stateStore);
  const values = Object.values(stateStore);

  const shadows = ['global', 'globalThis', 'fetch', 'XMLHttpRequest', 'require', 'window', 'document'];
  const shadowValues = shadows.map(() => undefined);

  const fnKeys = [...shadows, 'state', 'updateState', 'set', ...keys];
  const fnValues = [...shadowValues, scriptState, setFn, setFn, ...values];

  try {
    const run = new Function(...fnKeys, `"use strict"; ${action.script}`);
    const result = run(...fnValues);

    Object.entries(scriptState).forEach(([k, v]) => {
      if (stateStore[k] !== v && updateState) {
        updateState(k, v);
      }
    });

    return result !== undefined ? String(result) : '';
  } catch (e) {
    return `Error: ${e.message}`;
  }
}
```

---

### 4. Built-In Function Registry

MorphUI includes a built-in library of universal utilities and live REST integrations:

- `RUN_SCRIPT`: Executes arbitrary sandboxed JavaScript math, logic, state loops, and array filters.
- `EXECUTE_API`: Dynamically formats query strings, performs HTTP GET requests, and extracts response paths into the state store.
- `FETCH_CRYPTO_PRICE`: Retrieves live price data from Binance API.
- `FETCH_WEATHER`: Retrieves current temperature, humidity, and weather codes from Open-Meteo.
- `CALCULATE_BMI`: Processes height/weight metrics and categorizes health indicators.
- `CALCULATE_LOAN`: Calculates monthly amortizations and interest rates.
- `GENERATE_QR_URL`: Generates dynamic QR code endpoints.

---

### 5. Component Catalog

The renderer maps abstract schema nodes to over 40 native React Native components:

| Category | Components |
| :--- | :--- |
| **Layout & Containers** | `Container`, `Card`, `Row`, `Grid`, `Accordion`, `MultiScreenApp`, `Modal`, `ScrollView` |
| **Data Input & Pickers** | `Input`, `Slider`, `Select`, `Switch`, `RadioGroup`, `Checkbox`, `DatePicker`, `ChipGroup`, `Rating` |
| **Actions & Triggers** | `Button`, `IconButton`, `Chip`, `SegmentedControl`, `ActionSheet` |
| **Display & Feedback** | `Text`, `Heading`, `Badge`, `ProgressBar`, `StatCard`, `Divider`, `Icon`, `Avatar`, `Banner` |
| **Interactive Elements** | `Counter`, `Timer`, `TodoList`, `TabGroup`, `DynamicList` |

---

## Design Wizard & Runtime Customizer

MorphUI includes a multi-step design wizard and a live visual tweak drawer that operates directly on the active AST without re-prompting the language model:

1. **Design Wizard:** Guides the user through application category (Dashboard, Utility, Game, Finance), color palette selection, corner radius presets, and layout style tokens.
2. **Live Visual Customizer:** Traverses the active component tree and modifies background colors, border radius, and typography tokens dynamically while preserving all active state bindings.

---

## Experimental Nature & Research Scope

MorphUI is an experimental exploration into autonomous user interfaces. Please note the following characteristics:

- **Non-Deterministic Outputs:** Large language models can occasionally produce unexpected layouts, missing state bindings, or invalid action names.
- **Auto-Healing Layer:** MorphUI implements heuristics to detect and repair missing component types, broken array wrappers, and uninitialized state keys before mounting.
- **Client-Side Sandbox:** The runtime evaluates user-generated and model-generated logic in a restricted scope. While dangerous browser globals are shadowed, this engine is designed for local prototyping and experimental applications.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.12.0 or newer recommended)
- [Expo CLI](https://docs.expo.dev/)
- A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/MorphUI.git
cd MorphUI
```

2. Install project dependencies:
```bash
npm install
```

3. Configure your API Key:

Choose one of two options:

- **Option A (In-App Configuration):** Launch the app, open the Settings screen from the top-left menu, paste your Gemini API Key, and save.
- **Option B (Environment Variable):** Copy the example environment file and add your key:
```bash
cp .env.example .env
```
Inside `.env`:
```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

4. Start the development server:
```bash
npx expo start -c
```

5. Open **Expo Go** on your Android or iOS device and scan the displayed QR code.

---

## Project Structure

```text
MorphUI/
├── assets/                  # Application icons, fonts, and static assets
├── src/
│   ├── components/          # ComponentMap, DynamicRenderer, DebugConsole, PremiumLoader
│   ├── constants/           # Color palettes, design tokens, typography styles
│   ├── context/             # EngineContext (Global state, log stream, persistent storage)
│   ├── screens/             # HomeScreen, SavedScreen, SettingsScreen
│   ├── templates/           # Curated pre-built layout templates
│   └── utils/               # Gemini AI API caller, AST parsing, FunctionRegistry
├── App.js                   # Application root, screen transitions, and toast manager
├── app.json                 # Expo SDK configuration
├── .env.example             # Environment variable template
├── LICENSE                  # MIT License
└── package.json             # Project dependencies and script declarations
```

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Contact

This app is still under development. For questions, feedback, or collaboration inquiries, feel free to reach out:

- Email: sametbilal34@gmail.com
