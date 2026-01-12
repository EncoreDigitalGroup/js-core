/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/
/**
* Interface for spacing rules that add blank lines
*/

export interface ISpacingRule {

    /**
    * Name of the spacing rule
    */

    readonly name: string;

    /**
    * Apply the spacing rule to source code
    * @param source - Source code to transform
    * @returns Transformed source code with spacing applied
    */
    apply(source: string): string;
}
