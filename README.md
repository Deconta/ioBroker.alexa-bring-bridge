![Logo](admin/alexa-bring-bridge.png)
# ioBroker.alexa-bring-bridge

🇩🇪 **[Hier klicken für die deutsche Anleitung / Click here for the German README](README_de.md)**

## alexa-bring-bridge adapter for ioBroker

The **alexa-bring-bridge** adapter is a clever, fully automatic bridge between Amazon Alexa and your Bring! shopping list.
It intercepts everything you dictate to Alexa, intelligently filters and cleans the inputs, adds them to your Bring! list, and then fully automatically deletes them from your Alexa list on Amazon in the background.

> ⚠️ **Note:** The text parsing and filtering engine of this adapter is currently highly optimized for the **German** language (recognizing German numbers, fractions, packaging units, and trigger words). While basic forwarding might work in other languages, the advanced features require German voice commands.

## 📦 Requirements

Before you can use this adapter, the following adapters must be installed and configured in your ioBroker:
1. **[Alexa2 Adapter](https://github.com/Apollon77/ioBroker.alexa2):** Fully set up and connected to your Amazon account.
2. **[Bring! Adapter](https://github.com/foxriver76/ioBroker.bring):** Fully set up and connected to your Bring! account.

## 🌟 Features

### 🚀 Multi-Item Support (Bulk Shopping)
If you say, e.g., *"Alexa, add apples and bananas"*, the adapter automatically splits the sentence at every "and". It sends **separate items** to Bring! and also deletes them individually from Alexa.

### 🧮 Intelligent Quantity Adder
If you already have *"2 bottles of beer"* on your list and later say *"Put two bottles of beer on the list"*, the adapter reads the current Bring list and adds them up ➔ **"Beer, 4 bottles"** ends up in the app!

### 📦 Huge Packaging Dictionary
The filter recognizes countless household units such as packs, cans, jars, rolls, tubes, crates, and cartons.

### ⏱️ Anti-Swallow Guarantee (Staggering)
If multiple items are announced simultaneously, the script now sends them to Bring with a 1.5-second interval. This guarantees nothing gets lost.

### 🛠️ Polish & Bugfixes
The script now reacts to repeated, identical sentences, recognizes trigger words like "add", and cleanly clears hanging cloud wait loops upon adapter restart.

### 🍳 Recipe Resolution (NEW)
You can store your favorite recipes in the settings (e.g., "cake"). If you say *"Alexa, put cake on the shopping list"*, the stored ingredients (e.g., flour, eggs, sugar) are automatically added to your list.

### 🚫 Expert Filter: Synonyms (NEW)
- **Synonyms:** Invisibly swaps your colloquial terms (e.g., "Zewa") for Bring-compatible terms (e.g., "paper towels") so the correct icon appears.

### 🧠 Mathematical Total Number Parser & Fractions
Turns spoken words into real numbers. The logic also supports complex, compound number chains (e.g., *"two hundred fifty grams of butter"* ➔ 250) and fractions (*"half a kilo"* ➔ 0.5kg).

### 🔠 Automatic Capitalization & Clean Quantity Separation
The product name in Bring! is adopted with a capital first letter. Numbers and units are cleanly separated and land exactly in the `specification` (quantity) and `name` (product) fields in the Bring! app. No text mess!

### ☁️ Cloud Wait Loop (Dynamic Retry)
Because the Amazon cloud often needs a few seconds to update the JSON in ioBroker, the adapter checks up to 5 times every 3 seconds whether the item has arrived. Only when it appears there is it cleanly removed from the Alexa list.

### 🐛 Error Handling & Logging
Every text transformation and filtering is individually secured. If Alexa's speech recognition delivers total gibberish, the adapter does not crash, but cleanly logs the error and simply sends the item to Bring! as raw text in an emergency fallback.

### 💤 Resource Friendly
No permanent JSON polling in the background. The adapter only triggers when you actually announce something via Alexa.

## 🗣️ Example Sentences (German)

To give you an idea of what's possible, here are a few sentences you can say to Alexa (in German):
- *"Alexa, setze Milch auf die Einkaufsliste"* ➔ **Milch**
- *"Alexa, füge drei Kisten Wasser hinzu"* ➔ **Wasser (3 Kisten)**
- *"Alexa, packe ein halbes Kilo Hackfleisch auf die Liste"* ➔ **Hackfleisch (0.5 kg)**
- *"Alexa, setze Äpfel und Bananen auf die Einkaufsliste"* ➔ **Äpfel**, **Bananen**
- *"Alexa, schreibe zwei hundert fünfzig gramm butter auf die Liste"* ➔ **Butter (250 g)**

## ⚙️ Principle & Process

1. **Recognize:** You say: *"Alexa, put three bananas on the shopping list"*. The adapter reacts to the new text in your Alexa history (`alexa2.0.History.summary`).
2. **Enter:** The adapter grabs the item, filters it (synonyms, recipes), formats it, and immediately sends it to your Bring! adapter.
3. **Delete:** Since Alexa naturally still puts the item on its own list in parallel, the adapter waits briefly for the Amazon cloud. Then it searches the JSON of your Alexa shopping list, looks for the ID assigned by Amazon, and deletes the entry directly from the Alexa list.
4. **Result:** The product lands perfectly in your Bring! app and your Alexa list is automatically cleaned up in the background.

## Changelog
<!--
  Placeholder for the next version (at the beginning of the line):
  ### **WORK IN PROGRESS**
-->
### 0.0.12 (2026-07-03)
* (Deconta) update configurations and versions

### 0.0.8 (2026-07-02)
* (Deconta) initial release

## License
MIT License

Copyright (c) 2026 Deconta