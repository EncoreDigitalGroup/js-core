import { FileSortConfig } from "./formatters/file";
import { SortConfig } from "./shared/classMemberTypes";
export interface SortClassMembersConfig {
    dryRun?: boolean;
    classConfig?: SortConfig | null;
    reactConfig?: SortConfig | null;
    fileConfig?: FileSortConfig | null;
    include?: string[];
    exclude?: string[];
}
export declare function sortClassMembersInDirectory(targetDir: string, config?: SortConfig | SortClassMembersConfig): void;
export declare function sortClassMembersInFile(filePath: string, config?: SortConfig): string;
