/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/
/**
* Interface for code style formatting rules
*/


export interface IStyleRule {

    /**
    * Name of the rule
    */

    readonly name: string;

    /**
    * Apply the rule to source code
    * @param source - Source code to transform
    * @returns Transformed source code
    */
    apply(source: string): string;
}
