// This file extends the AdapterConfig type from "@iobroker/types"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            bringBaseId: string;
            alexa2BaseId: string;
            alexaHistorySummaryId: string;
            alexaHistoryAnswerId: string;
            alexaHistorySerialId: string;
            enableDebug: boolean;
            recipesList: { name: string; ingredients: string }[];
            blacklist: { word: string }[];
            synonymsList: { original: string; replacement: string }[];
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};