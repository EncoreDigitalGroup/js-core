import type { CoreConfig } from "./config";
import { FileSortConfig } from "./formatters/file";
import { SortConfig } from "./shared/classMemberTypes";
export interface SortClassMembersConfig {
    dryRun?: boolean;
    debug?: boolean;
    classConfig?: SortConfig | null;
    reactConfig?: SortConfig | null;
    fileConfig?: FileSortConfig | null;
    include?: string[];
    exclude?: string[];
}
export declare function __sortClassMembersInDirectory(config: CoreConfig, targetDir: string, dryRun?: boolean): void;
export declare function __sortClassMembersInFile(config: CoreConfig, filePath: string, dryRun?: boolean): string;
