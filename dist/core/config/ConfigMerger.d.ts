import { CoreConfig } from "./ConfigTypes";
export declare class ConfigMerger {
    private static deepMerge;
    static merge(userConfig: Partial<CoreConfig>): CoreConfig;
    static mergeMultiple(...configs: Partial<CoreConfig>[]): CoreConfig;
}
