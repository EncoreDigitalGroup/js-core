import { CoreConfig } from "./ConfigTypes";
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
export declare class ConfigValidator {
    static validate(config: CoreConfig): ValidationResult;
    static validateOrThrow(config: CoreConfig): void;
}
