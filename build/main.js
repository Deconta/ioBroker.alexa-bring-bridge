"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
class AlexaBringBridge extends utils.Adapter {
  activeTimeouts = [];
  constructor(options = {}) {
    super({
      ...options,
      name: "alexa-bring-bridge"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  customDebug(msg) {
    if (this.config.enableDebug) {
      this.log.info(`[DEBUG] ${msg}`);
    } else {
      this.log.debug(msg);
    }
  }
  onReady() {
    this.log.info(`config bringBaseId: ${this.config.bringBaseId}`);
    this.log.info(`config alexa2BaseId: ${this.config.alexa2BaseId}`);
    if (!this.config.alexaHistorySummaryId || !this.config.bringBaseId || !this.config.alexa2BaseId) {
      this.log.error("Adapter configuration is incomplete. Please check the settings.");
      return;
    }
    this.subscribeForeignStates(this.config.alexaHistorySummaryId);
    this.log.info(`Subscribed to Alexa history summary: ${this.config.alexaHistorySummaryId}`);
  }
  onUnload(callback) {
    try {
      this.activeTimeouts.forEach((timer) => this.clearTimeout(timer));
      this.activeTimeouts = [];
      this.log.info("Adapter stopped. All active timeouts cleared.");
      callback();
    } catch (error) {
      this.log.error(`Error during unloading: ${error.message}`);
      callback();
    }
  }
  async onStateChange(id, state) {
    if (state && id === this.config.alexaHistorySummaryId && state.ack) {
      try {
        if (typeof state.val !== "string") {
          return;
        }
        const summaryTextFull = state.val;
        const summaryText = summaryTextFull.toLowerCase();
        let alexaAnswer = "Keine Antwort aufgezeichnet";
        if (this.config.alexaHistoryAnswerId) {
          const answerState = await this.getForeignStateAsync(this.config.alexaHistoryAnswerId);
          if (answerState && answerState.val) {
            alexaAnswer = answerState.val.toString();
          }
        }
        this.customDebug(`New History Summary Entry: "${summaryTextFull}" | Alexa Answer: "${alexaAnswer}"`);
        const triggerPhrases = [" auf die einkaufsliste", " zur einkaufsliste", " hinzu", " hinzuf\xFCgen"];
        let itemFound = false;
        let itemNameRaw = "";
        for (const phrase of triggerPhrases) {
          const index = summaryText.lastIndexOf(phrase);
          if (index !== -1 && index > 0) {
            itemNameRaw = summaryTextFull.substring(0, index).trim();
            itemNameRaw = this.stripPrefixes(itemNameRaw);
            itemFound = true;
            break;
          }
        }
        if (itemFound && itemNameRaw) {
          let itemsToProcess = itemNameRaw.split(/,\s*|\s+und\s+/i).filter(Boolean);
          const expandedItems = [];
          itemsToProcess.forEach((item) => {
            var _a;
            const matchedRecipe = (_a = this.config.recipesList) == null ? void 0 : _a.find(
              (r) => r.name.toLowerCase() === item.trim().toLowerCase()
            );
            if (matchedRecipe && matchedRecipe.ingredients) {
              const ingredients = matchedRecipe.ingredients.split(/,\s*|\s+und\s+/i).filter(Boolean);
              expandedItems.push(...ingredients);
              this.customDebug(
                `Rezept erkannt: "${item.trim()}" wurde ersetzt durch: ${ingredients.join(", ")}`
              );
            } else {
              expandedItems.push(item);
            }
          });
          itemsToProcess = expandedItems;
          this.customDebug(`Multi-Item-Detection: Sentence divided into ${itemsToProcess.length} items.`);
          itemsToProcess.forEach(async (singleItemRaw, index) => {
            var _a;
            let itemToProcess = singleItemRaw.trim();
            const synonymMatch = (_a = this.config.synonymsList) == null ? void 0 : _a.find(
              (s) => s.original.toLowerCase() === itemToProcess.toLowerCase()
            );
            if (synonymMatch && synonymMatch.replacement) {
              this.customDebug(
                `Experten-Filter: Synonym erkannt: "${itemToProcess}" -> "${synonymMatch.replacement}"`
              );
              itemToProcess = synonymMatch.replacement;
            }
            const cleanResult = this.listCleaner(itemToProcess);
            const cleanedItemName = cleanResult.formatted;
            const originalItemName = itemToProcess;
            if (cleanedItemName) {
              let finalItemNameToBring = cleanedItemName;
              try {
                const bringContentStateId = `${this.config.bringBaseId}.content`;
                const bringContentState = await this.getForeignStateAsync(bringContentStateId);
                if (bringContentState && bringContentState.val) {
                  const bringList = typeof bringContentState.val === "string" ? JSON.parse(bringContentState.val) : bringContentState.val;
                  const existingItem = bringList.find(
                    (i) => i.name.toLowerCase() === cleanResult.product.toLowerCase()
                  );
                  if (existingItem && existingItem.specification) {
                    const mergedSpec = this.mergeQuantities(
                      existingItem.specification,
                      cleanResult.quantity
                    );
                    finalItemNameToBring = `${cleanResult.product}, ${mergedSpec}`;
                    this.customDebug(
                      `Item "${cleanResult.product}" exists. Merged quantity: "${existingItem.specification}" + "${cleanResult.quantity}" -> "${mergedSpec}"`
                    );
                  }
                }
              } catch (e) {
                this.customDebug(`Error reading existing Bring list: ${e.message}`);
              }
              const processingDelay = index * 1500;
              const processTimer = this.setTimeout(async () => {
                this.customDebug(
                  `[Item ${index + 1}/${itemsToProcess.length}] Raw: "${originalItemName}" -> Bring!: "${finalItemNameToBring}".`
                );
                const bringAddItemStateId = `${this.config.bringBaseId}.saveItem`;
                await this.setForeignStateAsync(bringAddItemStateId, finalItemNameToBring, false);
                const deleteTimer = this.setTimeout(() => {
                  void this.removeItemFromAlexaList(originalItemName, cleanResult.product);
                }, 4e3);
                if (deleteTimer) {
                  this.activeTimeouts.push(deleteTimer);
                }
              }, processingDelay);
              if (processTimer) {
                this.activeTimeouts.push(processTimer);
              }
            } else {
              this.customDebug(`Item "${originalItemName}" is empty after cleaning. Ignoring.`);
            }
          });
        }
      } catch (globalErr) {
        this.log.error(`Unexpected error in main loop: ${globalErr.message}`);
      }
    }
  }
  stripPrefixes(text) {
    if (!text) {
      return "";
    }
    const prefixesToRemove = [
      /^(?:hey\s+)?alexa,\s*/i,
      /^(?:hey\s+)?alexa\s+/i,
      /^füge\s+/i,
      /^setz\s+/i,
      /^setze\s+/i,
      /^packe\s+/i,
      /^pack\s+/i,
      /^schreib\s+/i,
      /^schreibe\s+/i,
      /^notiere\s+/i
    ];
    let result = String(text).trim();
    let changed = true;
    while (changed) {
      const startLen = result.length;
      for (const prefixRegex of prefixesToRemove) {
        result = result.replace(prefixRegex, "").trim();
      }
      changed = result.length !== startLen;
    }
    return result;
  }
  mergeQuantities(oldSpec, newSpec) {
    if (!oldSpec) {
      return newSpec;
    }
    if (!newSpec) {
      return oldSpec;
    }
    const regex = /^(\d+(?:[.,]\d+)?)\s*(.*)$/i;
    const matchOld = String(oldSpec).match(regex);
    const matchNew = String(newSpec).match(regex);
    if (matchOld && matchNew) {
      const numOld = parseFloat(matchOld[1].replace(",", "."));
      const numNew = parseFloat(matchNew[1].replace(",", "."));
      const unitOld = matchOld[2].trim().toLowerCase();
      const unitNew = matchNew[2].trim().toLowerCase();
      if (unitOld === unitNew || unitOld === "" || unitNew === "") {
        const total = numOld + numNew;
        const unitToUse = matchNew[2].trim() || matchOld[2].trim();
        return unitToUse ? `${total} ${unitToUse}` : `${total}`;
      }
      return `${oldSpec} + ${newSpec}`;
    }
    return newSpec;
  }
  wordsToNumbersSmart(text) {
    if (!text) {
      return "";
    }
    try {
      const t = String(text).toLowerCase().replace(/\s+/g, " ");
      const ones = {
        null: 0,
        eins: 1,
        eine: 1,
        einen: 1,
        ein: 1,
        milli: 1,
        zwei: 2,
        drei: 3,
        vier: 4,
        f\u00FCnf: 5,
        sechs: 6,
        sieben: 7,
        acht: 8,
        neun: 9,
        zehn: 10,
        elf: 11,
        zw\u00F6lf: 12,
        dreizehn: 13,
        vierzehn: 14,
        f\u00FCnfzehn: 15,
        sechzehn: 16,
        siebzehn: 17,
        achtzehn: 18,
        neunzehn: 19
      };
      const tens = {
        zwanzig: 20,
        drei\u00DFig: 30,
        dreissig: 30,
        vierzig: 40,
        f\u00FCnfzig: 50,
        sechzig: 60,
        siebzig: 70,
        achtzig: 80,
        neunzig: 90
      };
      const multipliers = { hundert: 100, tausend: 1e3 };
      const skipWords = ["und"];
      const words = t.split(/\s+/).filter(Boolean);
      const out = [];
      let currentNumber = 0;
      let hasNumber = false;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (ones[w] !== void 0) {
          currentNumber += ones[w];
          hasNumber = true;
        } else if (tens[w] !== void 0) {
          currentNumber += tens[w];
          hasNumber = true;
        } else if (multipliers[w] !== void 0) {
          if (currentNumber === 0) {
            currentNumber = 1;
          }
          currentNumber *= multipliers[w];
          hasNumber = true;
        } else if (!isNaN(Number(w))) {
          if (hasNumber) {
            out.push(String(currentNumber));
            currentNumber = 0;
            hasNumber = false;
          }
          out.push(w);
        } else if (skipWords.includes(w) && hasNumber) {
          continue;
        } else {
          if (hasNumber) {
            out.push(String(currentNumber));
            currentNumber = 0;
            hasNumber = false;
          }
          if (out.length === 0 || !isNaN(Number(out[out.length - 1]))) {
            out.push(w.charAt(0).toUpperCase() + w.slice(1));
          } else {
            out.push(w);
          }
        }
      }
      if (hasNumber) {
        out.push(String(currentNumber));
      }
      let resultString = out.join(" ");
      resultString = resultString.replace(/\b(1\s+)?halbe?s?\b/gi, "0.5");
      resultString = resultString.replace(/\b(1\s+)?viertel\b/gi, "0.25");
      return resultString;
    } catch (err) {
      this.log.warn(`Error in wordsToNumbersSmart for text "${text}": ${err.message}`);
      return String(text);
    }
  }
  listCleaner(Eintrag = "") {
    if (!Eintrag) {
      return { formatted: "", product: "", quantity: "" };
    }
    try {
      let textWithNumbers = this.wordsToNumbersSmart(Eintrag);
      if (!textWithNumbers || typeof textWithNumbers !== "string") {
        textWithNumbers = String(Eintrag);
      }
      textWithNumbers = textWithNumbers.trim();
      const quantityRegex = /^(\d+(?:[.,]\d+)?)(?:\s*(mal|x|stck|stück|l|ltr|liter|kg|kilo|g|gramm|pfund|flasche|flaschen|packung|packungen|päckchen|dose|dosen|becher|glas|gläser|rolle|rollen|tube|tuben|tafel|tafeln|kiste|kisten|karton|kartons))?\s+(.+)$/i;
      const match = textWithNumbers.match(quantityRegex);
      if (match && match[1] && match[3]) {
        const quantity = String(match[1]).trim();
        let unit = match[2] ? String(match[2]).trim().toLowerCase() : "";
        let product = String(match[3]).trim();
        if (product.length > 0) {
          product = product.charAt(0).toUpperCase() + product.slice(1);
          if (["kilo", "kg"].includes(unit)) {
            unit = "kg";
          } else if (["gramm", "g"].includes(unit)) {
            unit = "g";
          } else if (["liter", "l", "ltr"].includes(unit)) {
            unit = "l";
          } else if (["stck", "st\xFCck"].includes(unit)) {
            unit = "St\xFCck";
          } else if (["mal", "x"].includes(unit)) {
            unit = "";
          } else if (unit) {
            unit = unit.charAt(0).toUpperCase() + unit.slice(1);
          }
          const finalQuantity = unit ? `${quantity} ${unit}` : quantity;
          this.log.debug(
            `Quantity recognized: "${finalQuantity}", Product: "${product}" -> Formatted for Bring as "${product}, ${finalQuantity}"`
          );
          return { formatted: `${product}, ${finalQuantity}`, product, quantity: finalQuantity };
        }
      }
      const normProduct = textWithNumbers.charAt(0).toUpperCase() + textWithNumbers.slice(1);
      return { formatted: normProduct, product: normProduct, quantity: "" };
    } catch (err) {
      this.log.error(`Error in listCleaner for entry "${Eintrag}": ${err.message}`);
      const fallbackProduct = String(Eintrag).charAt(0).toUpperCase() + String(Eintrag).slice(1);
      return { formatted: fallbackProduct, product: fallbackProduct, quantity: "" };
    }
  }
  async removeItemFromAlexaList(itemName, extractedProduct, attempt = 1) {
    const maxAttempts = 5;
    const retryDelay = 3e3;
    let cleanedAlexaName = this.stripPrefixes(itemName);
    this.log.debug(
      `Attempting to remove "${cleanedAlexaName}" (Product Match: "${extractedProduct}") from Alexa list (Attempt ${attempt}/${maxAttempts}).`
    );
    try {
      const alexaShoppingListJsonId = `${this.config.alexa2BaseId}.json`;
      const listState = await this.getForeignStateAsync(alexaShoppingListJsonId);
      if (!listState || !listState.val) {
        this.log.debug("Alexa shopping list JSON is empty. Waiting for adapter update...");
        if (attempt < maxAttempts) {
          const timer = this.setTimeout(
            () => this.removeItemFromAlexaList(itemName, extractedProduct, attempt + 1),
            retryDelay
          );
          if (timer) {
            this.activeTimeouts.push(timer);
          }
        }
        return;
      }
      const shoppingList = JSON.parse(listState.val.toString());
      let itemIdToDelete = null;
      const search1 = cleanedAlexaName.toLowerCase();
      const search2 = extractedProduct.toLowerCase();
      for (const item of shoppingList) {
        if (item && item.value) {
          const valLower = item.value.toLowerCase();
          if (valLower === search1 || valLower === search2 || search1.includes(valLower) || valLower.includes(search2)) {
            itemIdToDelete = item.id;
            cleanedAlexaName = item.value;
            break;
          }
        }
      }
      if (itemIdToDelete) {
        const deleteStateId = `${this.config.alexa2BaseId}.items.${itemIdToDelete}.#delete`;
        this.log.debug(`Item ID found. Sending delete command to: ${deleteStateId}`);
        await this.setForeignStateAsync(deleteStateId, true);
        this.log.debug(`Delete command for "${cleanedAlexaName}" successfully sent to Amazon.`);
      } else {
        if (attempt < maxAttempts) {
          this.log.debug(
            `Item "${cleanedAlexaName}" / "${extractedProduct}" not found in JSON yet. Cloud syncing... Retrying in 3 sec.`
          );
          const timer = this.setTimeout(
            () => this.removeItemFromAlexaList(itemName, extractedProduct, attempt + 1),
            retryDelay
          );
          if (timer) {
            this.activeTimeouts.push(timer);
          }
        } else {
          this.log.debug(`Item was not found in JSON after ${maxAttempts} attempts.`);
        }
      }
    } catch (e) {
      this.log.error(`Error removing item from Alexa list: ${e.message}`);
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new AlexaBringBridge(options);
} else {
  (() => new AlexaBringBridge())();
}
//# sourceMappingURL=main.js.map
