![Logo](admin/alexa-bring-bridge.png)
# ioBroker.alexa-bring-bridge



## alexa-bring-bridge Adapter für ioBroker

Der **alexa-bring-bridge** Adapter ist eine clevere, vollautomatische Brücke zwischen Amazon Alexa und deiner Bring! Einkaufsliste. 
Er fängt alles ab, was du Alexa diktierst, filtert und säubert die Eingaben intelligent, fügt sie auf deiner Bring! Liste hinzu und löscht sie anschließend vollautomatisch wieder im Hintergrund von deiner Alexa-Liste auf Amazon.

## 📦 Voraussetzungen

Bevor du diesen Adapter nutzen kannst, müssen folgende Adapter in deinem ioBroker installiert und konfiguriert sein:
1. **[Alexa2 Adapter](https://github.com/Apollon77/ioBroker.alexa2):** Vollständig eingerichtet und mit deinem Amazon-Konto verbunden.
2. **[Bring! Adapter](https://github.com/foxriver76/ioBroker.bring):** Vollständig eingerichtet und mit deinem Bring!-Konto verbunden.

## 🛠️ Installation (Beta via GitHub)

Da der Adapter ganz neu ist, kannst du ihn aktuell direkt hier über GitHub installieren:

1. Öffne die ioBroker-Oberfläche und gehe zum Reiter **"Adapter"**.
2. Klicke oben auf das **GitHub-Symbol** (Installieren aus eigener URL / Install from custom URL).
3. Wähle im Tab "Benutzerdefiniert" (Custom) aus.
4. Trage bei URL diesen Link ein: `https://github.com/Deconta/ioBroker.alexa-bring-bridge`
5. Klicke auf **Installieren**.
6. Nach der Installation klickst du auf **Instanz hinzufügen** (das dicke Plus).
7. Konfiguriere die Instanz, indem du im Einstellungsmenü die entsprechenden Bring- und Alexa-Datenpunkte über das kleine Listen-Icon bequem auswählst.

## 🌟 Funktionen

### 🚀 Multi-Item-Support (Großeinkäufe)
Sagt ihr z. B. *"Alexa, füge Äpfel und Bananen hinzu"*, zerschneidet der Adapter den Satz ab sofort automatisch bei jedem "und". Er schickt **getrennte Artikel** an Bring! und löscht auch alle einzeln bei Alexa.

### 🧮 Intelligenter Mengen-Addierer
Wenn ihr schon *"2 Flaschen Bier"* auf der Liste habt und später *"Schreibe zwei Flaschen Bier auf die Liste"* sagt, liest der Adapter die aktuelle Bring-Liste aus und rechnet zusammen ➔ Es landen **"Bier, 4 Flaschen"** in der App!

### 📦 Riesiges Verpackungs-Wörterbuch
Der Filter erkennt unzählige Haushalts-Einheiten wie Packungen, Dosen, Gläser, Rollen, Tuben, Kisten und Kartons.

### ⏱️ Anti-Verschluck-Garantie (Staggering)
Werden mehrere Artikel gleichzeitig angesagt, schickt das Skript diese nun mit 1,5 Sekunden Abstand an Bring. So geht garantiert nichts mehr verloren.

### 🛠️ Feinschliff & Bugfixes
Das Skript reagiert nun auch auf wiederholte, identische Sätze, erkennt Trigger-Wörter wie "hinzu" und löscht hängende Cloud-Warteschleifen beim Adapter-Neustart sauber auf.

### 🍳 Rezept-Auflösung (NEU)
Du kannst in den Einstellungen deine Lieblingsrezepte hinterlegen (z.B. "Kuchen"). Sagst du *"Alexa, setze Kuchen auf die Einkaufsliste"*, werden automatisch die hinterlegten Zutaten (z.B. Mehl, Eier, Zucker) auf deine Liste gesetzt.

### 🚫 Experten-Filter: Synonyme (NEU)
- **Synonyme:** Tauscht deine umgangssprachlichen Begriffe (z.B. "Zewa") unsichtbar in Bring-kompatible Begriffe (z.B. "Küchenrolle") aus, damit das richtige Icon erscheint.

### 🧠 Mathematischer Zahlen-Gesamt-Parser & Bruchzahlen
Macht aus gesprochenen Wörtern echte Zahlen. Die Logik unterstützt auch komplexe, zusammengesetzte Zahlenketten (z. B. *"zwei hundert fünfzig gramm butter"* ➔ 250) und Bruchzahlen (*"ein halbes Kilo"* ➔ 0.5Kg). 

### 🔠 Automatische Groß-/Kleinschreibung & Saubere Mengentrennung
Der Produktname in Bring! wird mit einem großen Anfangsbuchstaben übernommen. Zahlen und Einheiten werden sauber getrennt und landen in der Bring!-App exakt im Feld `specification` (Menge) und `name` (Produkt). Kein Textmatsch!

### ☁️ Cloud-Warteschleife (Dynamic Retry)
Weil die Amazon-Cloud oft ein paar Sekunden braucht, um das JSON im ioBroker zu aktualisieren, prüft der Adapter bis zu 5-mal alle 3 Sekunden nach, ob der Artikel angekommen ist. Erst wenn er dort auftaucht, wird er sauber von der Alexa-Liste entfernt.

### 🐛 Error-Handling & Logging
Jede Texttransformation und Filterung ist einzeln abgesichert. Sollte die Spracherkennung von Alexa mal totalen Kauderwelsch liefern, stürzt der Adapter nicht ab, sondern loggt den Fehler sauber und schickt den Artikel im Notfall-Fallback einfach als Rohtext an Bring!.

### 💤 Schont die Ressourcen
Kein permanentes JSON-Dauer-Polling im Hintergrund. Der Adapter springt nur an, wenn du auch wirklich etwas über Alexa ansagst.

## 🗣️ Beispielsätze

Damit du eine Idee bekommst, was alles möglich ist, hier ein paar Sätze, die du zu Alexa sagen kannst:
- *"Alexa, setze Milch auf die Einkaufsliste"* ➔ **Milch**
- *"Alexa, füge drei Kisten Wasser hinzu"* ➔ **Wasser (3 Kisten)**
- *"Alexa, packe ein halbes Kilo Hackfleisch auf die Liste"* ➔ **Hackfleisch (0.5 kg)**
- *"Alexa, setze Äpfel und Bananen auf die Einkaufsliste"* ➔ **Äpfel**, **Bananen**
- *"Alexa, schreibe zwei hundert fünfzig gramm butter auf die Liste"* ➔ **Butter (250 g)**

## ⚙️ Prinzip & Ablauf

1. **Erkennen:** Ihr sagt: *"Alexa, pack drei Bananen auf die Einkaufsliste"*. Der Adapter reagiert auf den neuen Text in eurem Alexa-Verlauf (`alexa2.0.History.summary`).
2. **Eintragen:** Der Adapter schnappt sich den Artikel, filtert ihn (Synonyme, Rezepte), formatiert ihn und schickt ihn sofort an euren Bring!-Adapter.
3. **Löschen:** Da Alexa den Artikel parallel natürlich trotzdem auf ihre eigene Liste setzt, wartet der Adapter kurz auf die Amazon-Cloud. Dann durchsucht er das JSON eurer Alexa-Einkaufsliste, sucht die von Amazon vergebene ID und löscht den Eintrag direkt von der Alexa-Liste.
4. **Ergebnis:** Das Produkt landet perfekt in eurer Bring!-App und eure Alexa-Liste wird im Hintergrund automatisch bereinigt.

### **IN ARBEIT (WORK IN PROGRESS)**
* (Deconta) Erstveröffentlichung (02.07.2026)

## Lizenz (License)
MIT License

Copyright (c) 2026 Deconta