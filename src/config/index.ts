/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
export {
    type CoreConfig,
    type PrettierConfig,
    type PackageJsonConfig,
    type TsConfigConfig,
    type ClassMemberConfig,
    type ReactComponentConfig,
    type FileDeclarationConfig,
    type SortersConfig,
    defaultConfig,
    __mergeConfig,
    configure,
} from "./types";

export {__loadConfig, __hasConfigFile, CONFIG_FILE_NAME} from "./loader";
