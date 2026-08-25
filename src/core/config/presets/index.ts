/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 *
 * Hand-maintained preset registry. Add a preset by creating a sibling file and adding one entry to
 * PRESETS; PresetName and editor autocomplete on the `preset` config key update automatically.
 */
import type {CoreConfig} from "../ConfigTypes";
import {laravelPreset} from "./laravel";

/** All built-in presets, keyed by the name users put in `preset`. Add a preset by adding one entry here. */
export const PRESETS = {
    laravel: laravelPreset,
} satisfies Record<string, Partial<CoreConfig>>;

/** The set of valid `preset` values, derived from the registry so the type and the runtime map never drift. */
export type PresetName = keyof typeof PRESETS;

/** Resolve a preset name to its config layer. Throws (listing valid names) when the name is not registered. */
export function resolvePreset(name: string): Partial<CoreConfig> {
    if (!(name in PRESETS)) {
        const valid = Object.keys(PRESETS).map(n => `"${n}"`).join(", ");
        throw new Error(`Unknown preset "${name}". Valid presets: ${valid}.`);
    }

    return PRESETS[name as PresetName];
}