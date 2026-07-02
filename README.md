![Logo](admin/alexa-bring-bridge.png)
# ioBroker.alexa-bring-bridge

[![NPM version](https://img.shields.io/npm/v/iobroker.alexa-bring-bridge.svg)](https://www.npmjs.com/package/iobroker.alexa-bring-bridge)
[![Downloads](https://img.shields.io/npm/dm/iobroker.alexa-bring-bridge.svg)](https://www.npmjs.com/package/iobroker.alexa-bring-bridge)
![Number of Installations](https://iobroker.live/badges/alexa-bring-bridge-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/alexa-bring-bridge-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.alexa-bring-bridge.png?downloads=true)](https://nodei.co/npm/iobroker.alexa-bring-bridge/)

**Tests:** ![Test and Release](https://github.com/julian/ioBroker.alexa-bring-bridge/workflows/Test%20and%20Release/badge.svg)

## alexa-bring-bridge Adapter für ioBroker

Der **alexa-bring-bridge** Adapter ist eine clevere, vollautomatische Brücke zwischen Amazon Alexa und deiner Bring! Einkaufsliste. 
Er fängt alles ab, was du Alexa diktierst, filtert und säubert die Eingaben intelligent, fügt sie auf deiner Bring! Liste hinzu und löscht sie anschließend vollautomatisch wieder im Hintergrund von deiner Alexa-Liste auf Amazon.

## 🌟 Funktionen

### 🚀 Multi-Item-Support (Großeinkäufe)
Sagt ihr z. B. *"Alexa, füge Äpfel und Bananen hinzu"*, zerschneidet der Adapter den Satz ab sofort automatisch bei jedem "und" oder Komma. Er schickt **getrennte Artikel** an Bring! und löscht auch alle einzeln bei Alexa.

### 🧮 Intelligenter Mengen-Addierer
Wenn ihr schon *"2 Flaschen Bier"* auf der Liste habt und später *"Schreibe zwei Flaschen Bier auf die Liste"* sagt, liest der Adapter die aktuelle Bring-Liste aus und rechnet zusammen ➔ Es landen **"Bier, 4 Flaschen"** in der App!

### 📦 Riesiges Verpackungs-Wörterbuch
Der Filter erkennt unzählige Haushalts-Einheiten wie Packungen, Dosen, Gläser, Rollen, Tuben, Kisten und Kartons.

### ⏱️ Anti-Verschluck-Garantie (Staggering)
Werden mehrere Artikel gleichzeitig angesagt, schickt das Skript diese nun mit 1,5 Sekunden Abstand an Bring. So geht garantiert nichts mehr verloren.

### 🍳 Rezept-Auflösung (NEU)
Du kannst in den Einstellungen deine Lieblingsrezepte hinterlegen (z.B. "Kuchen"). Sagst du *"Alexa, setze Kuchen auf die Einkaufsliste"*, werden automatisch die hinterlegten Zutaten (z.B. Mehl, Eier, Zucker) auf deine Liste gesetzt.

### 🚫 Experten-Filter: Blacklist & Synonyme (NEU)
- **Blacklist:** Verhindert, dass unerwünschte Wörter (wie "Einkaufsliste") auf Bring! landen.
- **Synonyme:** Tauscht deine umgangssprachlichen Begriffe (z.B. "Zewa") unsichtbar in Bring-kompatible Begriffe (z.B. "Küchenrolle") aus, damit das richtige Icon erscheint.

### 🧠 Mathematischer Zahlen-Gesamt-Parser & Bruchzahlen
Macht aus gesprochenen Wörtern echte Zahlen. Die Logik unterstützt auch komplexe, zusammengesetzte Zahlenketten (z. B. *"zwei hundert fünfzig gramm butter"* ➔ 250) und Bruchzahlen (*"ein halbes Kilo"* ➔ 0.5Kg). 

### 🔠 Automatische Groß-/Kleinschreibung & Saubere Mengentrennung
Der Produktname in Bring! wird mit einem großen Anfangsbuchstaben übernommen. Zahlen und Einheiten werden sauber getrennt und landen in der Bring!-App exakt im Feld `specification` (Menge) und `name` (Produkt). Kein Textmatsch!

### ☁️ Cloud-Warteschleife (Dynamic Retry)
Weil die Amazon-Cloud oft ein paar Sekunden braucht, um das JSON im ioBroker zu aktualisieren, prüft der Adapter bis zu 5-mal alle 3 Sekunden nach, ob der Artikel angekommen ist. Erst wenn er dort auftaucht, wird er sauber von der Alexa-Liste entfernt.

## ⚙️ Prinzip & Ablauf

1. **Erkennen:** Ihr sagt: *"Alexa, pack drei Bananen auf die Einkaufsliste"*. Der Adapter reagiert auf den neuen Text in eurem Alexa-Verlauf (`alexa2.0.History.summary`).
2. **Eintragen:** Der Adapter schnappt sich den Artikel, filtert ihn (Blacklist, Synonyme, Rezepte), formatiert ihn und schickt ihn sofort an euren Bring!-Adapter.
3. **Löschen:** Da Alexa den Artikel parallel natürlich trotzdem auf ihre eigene Liste setzt, wartet der Adapter kurz auf die Amazon-Cloud. Dann durchsucht er das JSON eurer Alexa-Einkaufsliste, sucht die von Amazon vergebene ID und löscht den Eintrag direkt von der Alexa-Liste.
4. **Ergebnis:** Das Produkt landet perfekt in eurer Bring!-App und eure Alexa-Liste wird im Hintergrund automatisch bereinigt.

## Änderungen (Changelog)
### **IN ARBEIT (WORK IN PROGRESS)**
* (Julian) Erstveröffentlichung (initial release)

## Lizenz (License)
MIT License

Copyright (c) 2026 Julian <julian@example.com>