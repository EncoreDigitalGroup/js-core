/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 *
 * Public entry point for consumers. It exposes only the configuration API — the `tsfmt` helper and
 * the config types — none of which imports `ts-morph`, `typescript`, or `reflect-metadata`. The
 * full library barrel (`./index`) drags those dev-only dependencies into the type graph, which a
 * consumer install does not have; importing from here keeps `tsfmt.config.ts` type-checking clean
 * in editors. `package.json` points `types`/`exports` at this file's declaration output.
 */
export {tsfmt} from "./core/config/tsfmt";
export {DeclarationType, FormatterOrder, MemberType} from "./core/config/ConfigTypes";
export type {PresetName} from "./core/config/presets";

export type {
    ClassMemberConfig,
    CodeStyleConfig,
    CoreConfig,
    FileDeclarationConfig,
    ImportConfig,
    ImportRestrictionEntry,
    ImportRestrictionRule,
    IndexGenerationConfig,
    IndexGenerationOptions,
    PackageJsonConfig,
    PathsConfig,
    ReactComponentConfig,
    RestrictionsConfig,
    SortingConfig,
    SpacingConfig,
    TsConfigConfig,
} from "./core/config/ConfigTypes";