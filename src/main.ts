import * as utils from '@iobroker/adapter-core';

class AlexaBringBridge extends utils.Adapter {
    private activeTimeouts: ioBroker.Timeout[] = [];

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'alexa-bring-bridge',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    private customDebug(msg: string): void {
        if (this.config.enableDebug) {
            this.log.info(`[DEBUG] ${msg}`);
        } else {
            this.log.debug(msg);
        }
    }

    private onReady(): void {
        this.log.info(`config bringBaseId: ${this.config.bringBaseId}`);
        this.log.info(`config alexa2BaseId: ${this.config.alexa2BaseId}`);

        if (!this.config.alexaHistorySummaryId || !this.config.bringBaseId || !this.config.alexa2BaseId) {
            this.log.error('Adapter configuration is incomplete. Please check the settings.');
            return;
        }

        this.subscribeForeignStates(this.config.alexaHistorySummaryId);
        this.log.info(`Subscribed to Alexa history summary: ${this.config.alexaHistorySummaryId}`);
    }

    private onUnload(callback: () => void): void {
        try {
            this.activeTimeouts.forEach(timer => this.clearTimeout(timer));
            this.activeTimeouts = [];
            this.log.info('Adapter stopped. All active timeouts cleared.');
            callback();
        } catch (error) {
            this.log.error(`Error during unloading: ${(error as Error).message}`);
            callback();
        }
    }

    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (state && id === this.config.alexaHistorySummaryId && state.ack) {
            try {
                if (typeof state.val !== 'string') {
                    return;
                }

                const summaryTextFull = state.val;
                const summaryText = summaryTextFull.toLowerCase();

                let alexaAnswer = 'Keine Antwort aufgezeichnet';
                if (this.config.alexaHistoryAnswerId) {
                    const answerState = await this.getForeignStateAsync(this.config.alexaHistoryAnswerId);
                    if (answerState && answerState.val) {
                        alexaAnswer = answerState.val.toString();
                    }
                }

                this.customDebug(`New History Summary Entry: "${summaryTextFull}" | Alexa Answer: "${alexaAnswer}"`);

                const triggerPhrases = [' auf die einkaufsliste', ' zur einkaufsliste', ' hinzu', ' hinzufügen'];
                let itemFound = false;
                let itemNameRaw = '';

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

                    // Rezept-Auflösung
                    const expandedItems: string[] = [];
                    itemsToProcess.forEach(item => {
                        const matchedRecipe = this.config.recipesList?.find(
                            r => r.name.toLowerCase() === item.trim().toLowerCase(),
                        );
                        if (matchedRecipe && matchedRecipe.ingredients) {
                            const ingredients = matchedRecipe.ingredients.split(/,\s*|\s+und\s+/i).filter(Boolean);
                            expandedItems.push(...ingredients);
                            this.customDebug(
                                `Rezept erkannt: "${item.trim()}" wurde ersetzt durch: ${ingredients.join(', ')}`,
                            );
                        } else {
                            expandedItems.push(item);
                        }
                    });
                    itemsToProcess = expandedItems;

                    this.customDebug(`Multi-Item-Detection: Sentence divided into ${itemsToProcess.length} items.`);

                    itemsToProcess.forEach(async (singleItemRaw, index) => {
                        let itemToProcess = singleItemRaw.trim();

                        // 1. Synonym-Check
                        const synonymMatch = this.config.synonymsList?.find(
                            s => s.original.toLowerCase() === itemToProcess.toLowerCase(),
                        );
                        if (synonymMatch && synonymMatch.replacement) {
                            this.customDebug(
                                `Experten-Filter: Synonym erkannt: "${itemToProcess}" -> "${synonymMatch.replacement}"`,
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
                                    const bringList =
                                        typeof bringContentState.val === 'string'
                                            ? JSON.parse(bringContentState.val)
                                            : bringContentState.val;
                                    const existingItem = bringList.find(
                                        (i: any) => i.name.toLowerCase() === cleanResult.product.toLowerCase(),
                                    );

                                    if (existingItem && existingItem.specification) {
                                        const mergedSpec = this.mergeQuantities(
                                            existingItem.specification,
                                            cleanResult.quantity,
                                        );
                                        finalItemNameToBring = `${cleanResult.product}, ${mergedSpec}`;
                                        this.customDebug(
                                            `Item "${cleanResult.product}" exists. Merged quantity: "${existingItem.specification}" + "${cleanResult.quantity}" -> "${mergedSpec}"`,
                                        );
                                    }
                                }
                            } catch (e: any) {
                                this.customDebug(`Error reading existing Bring list: ${e.message}`);
                            }

                            const processingDelay = index * 1500;

                            const processTimer = this.setTimeout(async () => {
                                this.customDebug(
                                    `[Item ${index + 1}/${itemsToProcess.length}] Raw: "${originalItemName}" -> Bring!: "${finalItemNameToBring}".`,
                                );

                                const bringAddItemStateId = `${this.config.bringBaseId}.saveItem`;
                                await this.setForeignStateAsync(bringAddItemStateId, finalItemNameToBring, false);

                                const deleteTimer = this.setTimeout(() => {
                                    void this.removeItemFromAlexaList(originalItemName, cleanResult.product);
                                }, 4000);
                                if (deleteTimer) this.activeTimeouts.push(deleteTimer);
                            }, processingDelay);
                            if (processTimer) this.activeTimeouts.push(processTimer);
                        } else {
                            this.customDebug(`Item "${originalItemName}" is empty after cleaning. Ignoring.`);
                        }
                    });
                }
            } catch (globalErr: any) {
                this.log.error(`Unexpected error in main loop: ${globalErr.message}`);
            }
        }
    }

    private stripPrefixes(text: string): string {
        if (!text) {
            return '';
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
            /^notiere\s+/i,
        ];
        let result = String(text).trim();
        let changed = true;

        while (changed) {
            const startLen = result.length;
            for (const prefixRegex of prefixesToRemove) {
                result = result.replace(prefixRegex, '').trim();
            }
            changed = result.length !== startLen;
        }
        return result;
    }

    private mergeQuantities(oldSpec: string, newSpec: string): string {
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
            const numOld = parseFloat(matchOld[1].replace(',', '.'));
            const numNew = parseFloat(matchNew[1].replace(',', '.'));
            const unitOld = matchOld[2].trim().toLowerCase();
            const unitNew = matchNew[2].trim().toLowerCase();

            if (unitOld === unitNew || unitOld === '' || unitNew === '') {
                const total = numOld + numNew;
                const unitToUse = matchNew[2].trim() || matchOld[2].trim();
                return unitToUse ? `${total} ${unitToUse}` : `${total}`;
            }
            return `${oldSpec} + ${newSpec}`;
        }
        return newSpec;
    }

    private wordsToNumbersSmart(text: string): string {
        if (!text) {
            return '';
        }
        try {
            const t = String(text).toLowerCase().replace(/\s+/g, ' ');

            const ones: Record<string, number> = {
                null: 0,
                eins: 1,
                eine: 1,
                einen: 1,
                ein: 1,
                milli: 1,
                zwei: 2,
                drei: 3,
                vier: 4,
                fünf: 5,
                sechs: 6,
                sieben: 7,
                acht: 8,
                neun: 9,
                zehn: 10,
                elf: 11,
                zwölf: 12,
                dreizehn: 13,
                vierzehn: 14,
                fünfzehn: 15,
                sechzehn: 16,
                siebzehn: 17,
                achtzehn: 18,
                neunzehn: 19,
            };
            const tens: Record<string, number> = {
                zwanzig: 20,
                dreißig: 30,
                dreissig: 30,
                vierzig: 40,
                fünfzig: 50,
                sechzig: 60,
                siebzig: 70,
                achtzig: 80,
                neunzig: 90,
            };
            const multipliers: Record<string, number> = { hundert: 100, tausend: 1000 };
            const skipWords = ['und'];

            const words = t.split(/\s+/).filter(Boolean);
            const out: string[] = [];

            let currentNumber = 0;
            let hasNumber = false;

            for (let i = 0; i < words.length; i++) {
                const w = words[i];

                if (ones[w] !== undefined) {
                    currentNumber += ones[w];
                    hasNumber = true;
                } else if (tens[w] !== undefined) {
                    currentNumber += tens[w];
                    hasNumber = true;
                } else if (multipliers[w] !== undefined) {
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

            let resultString = out.join(' ');

            resultString = resultString.replace(/\b(1\s+)?halbe?s?\b/gi, '0.5');
            resultString = resultString.replace(/\b(1\s+)?viertel\b/gi, '0.25');

            return resultString;
        } catch (err: any) {
            this.log.warn(`Error in wordsToNumbersSmart for text "${text}": ${err.message}`);
            return String(text);
        }
    }

    private listCleaner(Eintrag = ''): { formatted: string; product: string; quantity: string } {
        if (!Eintrag) {
            return { formatted: '', product: '', quantity: '' };
        }

        try {
            let textWithNumbers = this.wordsToNumbersSmart(Eintrag);
            if (!textWithNumbers || typeof textWithNumbers !== 'string') {
                textWithNumbers = String(Eintrag);
            }

            textWithNumbers = textWithNumbers.trim();

            const quantityRegex =
                /^(\d+(?:[.,]\d+)?)(?:\s*(mal|x|stck|stück|l|ltr|liter|kg|kilo|g|gramm|pfund|flasche|flaschen|packung|packungen|päckchen|dose|dosen|becher|glas|gläser|rolle|rollen|tube|tuben|tafel|tafeln|kiste|kisten|karton|kartons))?\s+(.+)$/i;
            const match = textWithNumbers.match(quantityRegex);

            if (match && match[1] && match[3]) {
                const quantity = String(match[1]).trim();
                let unit = match[2] ? String(match[2]).trim().toLowerCase() : '';
                let product = String(match[3]).trim();

                if (product.length > 0) {
                    product = product.charAt(0).toUpperCase() + product.slice(1);

                    if (['kilo', 'kg'].includes(unit)) {
                        unit = 'kg';
                    } else if (['gramm', 'g'].includes(unit)) {
                        unit = 'g';
                    } else if (['liter', 'l', 'ltr'].includes(unit)) {
                        unit = 'l';
                    } else if (['stck', 'stück'].includes(unit)) {
                        unit = 'Stück';
                    } else if (['mal', 'x'].includes(unit)) {
                        unit = '';
                    } else if (unit) {
                        unit = unit.charAt(0).toUpperCase() + unit.slice(1);
                    }

                    const finalQuantity = unit ? `${quantity} ${unit}` : quantity;

                    this.log.debug(
                        `Quantity recognized: "${finalQuantity}", Product: "${product}" -> Formatted for Bring as "${product}, ${finalQuantity}"`,
                    );
                    return { formatted: `${product}, ${finalQuantity}`, product: product, quantity: finalQuantity };
                }
            }

            const normProduct = textWithNumbers.charAt(0).toUpperCase() + textWithNumbers.slice(1);
            return { formatted: normProduct, product: normProduct, quantity: '' };
        } catch (err: any) {
            this.log.error(`Error in listCleaner for entry "${Eintrag}": ${err.message}`);
            const fallbackProduct = String(Eintrag).charAt(0).toUpperCase() + String(Eintrag).slice(1);
            return { formatted: fallbackProduct, product: fallbackProduct, quantity: '' };
        }
    }

    private async removeItemFromAlexaList(
        itemName: string,
        extractedProduct: string,
        attempt: number = 1,
    ): Promise<void> {
        const maxAttempts = 5;
        const retryDelay = 3000;

        let cleanedAlexaName = this.stripPrefixes(itemName);
        this.log.debug(
            `Attempting to remove "${cleanedAlexaName}" (Product Match: "${extractedProduct}") from Alexa list (Attempt ${attempt}/${maxAttempts}).`,
        );

        try {
            const alexaShoppingListJsonId = `${this.config.alexa2BaseId}.json`;
            const listState = await this.getForeignStateAsync(alexaShoppingListJsonId);

            if (!listState || !listState.val) {
                this.log.debug('Alexa shopping list JSON is empty. Waiting for adapter update...');
                if (attempt < maxAttempts) {
                    const timer = this.setTimeout(
                        () => this.removeItemFromAlexaList(itemName, extractedProduct, attempt + 1),
                        retryDelay,
                    );
                    if (timer) this.activeTimeouts.push(timer);
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
                    if (
                        valLower === search1 ||
                        valLower === search2 ||
                        search1.includes(valLower) ||
                        valLower.includes(search2)
                    ) {
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
                        `Item "${cleanedAlexaName}" / "${extractedProduct}" not found in JSON yet. Cloud syncing... Retrying in 3 sec.`,
                    );
                    const timer = this.setTimeout(
                        () => this.removeItemFromAlexaList(itemName, extractedProduct, attempt + 1),
                        retryDelay,
                    );
                    if (timer) this.activeTimeouts.push(timer);
                } else {
                    this.log.debug(`Item was not found in JSON after ${maxAttempts} attempts.`);
                }
            }
        } catch (e: any) {
            this.log.error(`Error removing item from Alexa list: ${e.message}`);
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new AlexaBringBridge(options);
} else {
    // otherwise start the instance directly
    (() => new AlexaBringBridge())();
}
