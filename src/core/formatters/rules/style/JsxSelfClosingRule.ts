/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {Node, SyntaxKind} from "ts-morph";
import {BaseFormattingRule} from "../../BaseFormattingRule";
import {FormatContext} from "../../FormatContext";

/**
 * Normalizes the whitespace before the `/>` of a self-closing JSX element.
 * - jsxSelfClosingSpace: false (default) -> `<Divider/>`, `<Box a="b"/>`
 * - jsxSelfClosingSpace: true            -> `<Divider />`, `<Box a="b" />`
 *
 * Only same-line spacing is touched: a `/>` that sits on its own line (multi-line attribute list)
 * keeps the newline and its indentation, so this never collapses a wrapped tag onto one line.
 */
export class JsxSelfClosingRule extends BaseFormattingRule {
    readonly name = "JsxSelfClosingRule";

    override applyToContext(context: FormatContext): void {
        const config = this.getCodeStyleConfig();
        if (!config || config.jsxSelfClosingSpace === undefined) {
            return;
        }

        const wantSpace = config.jsxSelfClosingSpace;
        const fullText = context.sourceFile.getFullText();
        const changes: Array<{ pos: number; type: "add" | "remove" }> = [];
        const visit = (node: Node) => {
            if (node.getKind() === SyntaxKind.JsxSelfClosingElement) {
                // The element's own `/>` is always the final two characters of its text; any nested
                // self-closing element inside an attribute value ends earlier, so this is unambiguous.
                const slashPos = node.getEnd() - 2;

                // Collect the run of same-line whitespace immediately before the `/`.
                let pos = slashPos - 1;
                const wsRun: number[] = [];

                while (pos >= 0 && (fullText[pos] === " " || fullText[pos] === "\t")) {
                    wsRun.push(pos);
                    pos--;
                }

                // A newline before the run means the `/>` is on its own line — leave it alone.
                if (fullText[pos] === "\n") {
                    node.forEachChild(visit);

                    return;
                }

                if (wantSpace) {
                    if (wsRun.length === 0) {
                        changes.push({pos: slashPos, type: "add"});
                    } else {
                        // Collapse multiple spaces to exactly one.
                        for (const p of wsRun.slice(0, -1)) {
                            changes.push({pos: p, type: "remove"});
                        }
                    }
                } else {
                    for (const p of wsRun) {
                        changes.push({pos: p, type: "remove"});
                    }
                }
            }

            node.forEachChild(visit);
        };

        visit(context.sourceFile);

        if (changes.length === 0) {
            return;
        }

        // Apply from end to start so earlier positions stay valid.
        changes.sort((a, b) => b.pos - a.pos);

        for (const change of changes) {
            if (change.type === "add") {
                context.sourceFile.insertText(change.pos, " ");
            } else {
                context.sourceFile.removeText(change.pos, change.pos + 1);
            }
        }
    }
}