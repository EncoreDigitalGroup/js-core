export interface IFormattingRule {
    readonly name: string;
    apply(source: string, filePath?: string): string;
}
