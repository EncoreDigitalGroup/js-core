import { CoreConfig } from "../config";
import { Container } from "../di";
import { IFormattingRule } from "./IFormattingRule";
export declare abstract class BaseFormattingRule implements IFormattingRule {
    protected readonly container: Container;
    protected readonly config: CoreConfig;
    abstract readonly name: string;
    constructor(container: Container, config?: CoreConfig);
    abstract apply(source: string, filePath?: string): string;
    protected getConfig(): CoreConfig;
    protected getCodeStyleConfig(): import("../config").CodeStyleConfig | undefined;
    protected getImportsConfig(): import("../config").ImportConfig | undefined;
    protected getIndexGenerationConfig(): import("./rules").IndexGenerationConfig | undefined;
    protected getSortingConfig(): import("../config").SortingConfig | undefined;
    protected getSpacingConfig(): import("../config").SpacingConfig | undefined;
}
