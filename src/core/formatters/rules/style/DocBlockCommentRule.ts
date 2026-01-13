/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { BaseFormattingRule } from "../../BaseFormattingRule";


/**
* Consolidates single-line doc block comments into a single line
* Transforms multi-line doc blocks that contain only one line of text
*/
export class DocBlockCommentRule extends BaseFormattingRule {
    readonly name = "DocBlockCommentRule";

    apply(source: string, filePath?: string): string {
        // Match doc block comments that span multiple lines but only have one content line
        const docBlockPattern = /\/\*\*\s*\n\s*\*\s*([^\n]*?)\s*\n\s*\*\//g;

        return source.replace(docBlockPattern, (match, content) => {
            // Only consolidate if there's actual content and it's a single line
            if (content && content.trim()) {
                return `/** ${content.trim()} */`;
            }
            // Return original if no content or empty
            return match;
        });
    }
}