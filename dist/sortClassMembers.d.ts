import { FileSortConfig } from "./formatters/file";
import { SortConfig } from "./shared/classMemberTypes";
import type { CoreConfig } from "./config";
export interface SortClassMembersConfig {
    dryRun?: boolean;
    debug?: boolean;
    classConfig?: SortConfig | null;
    reactConfig?: SortConfig | null;
    fileConfig?: FileSortConfig | null;
    include?: string[];
    exclude?: string[];
}
export declare function sortClassMembersInDirectory(config: CoreConfig, targetDir: string, dryRun?: boolean): void;
export declare function sortClassMembersInFile(config: CoreConfig, filePath: string, dryRun?: boolean): string;
