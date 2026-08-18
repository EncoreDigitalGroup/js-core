/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */

/** A half-open character range `[start, end)`, as returned by `FormatContext.getProtectedRanges()`. */
export interface ProtectedRange {
    start: number;
    end: number;
}

/** The protected range (if any) whose span contains character offset `pos`. */
export function findRangeContaining(protectedRanges: ProtectedRange[], pos: number): ProtectedRange | undefined {
    return protectedRanges.find(range => range.start <= pos && pos < range.end);
}

/** True when the half-open ranges `[startA, endA)` and `[startB, endB)` overlap at all. */
export function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
    return startA < endB && startB < endA;
}

/** True when `[start, end)` overlaps any of `protectedRanges` — JSX text/expressions or template literals. */
export function overlapsProtectedRange(start: number, end: number, protectedRanges: ProtectedRange[]): boolean {
    return protectedRanges.some(range => rangesOverlap(start, end, range.start, range.end));
}

/**
 * Zero-based indices of every line in `text` whose character span overlaps a protected range.
 * Line/regex whitespace rules must leave these lines untouched so they never rewrite whitespace
 * inside JSX text, JSX expression containers, or template literals.
 */
export function getProtectedLineIndices(text: string, protectedRanges: ProtectedRange[]): Set<number> {
    const protectedLines = new Set<number>();

    if (protectedRanges.length === 0) {
        return protectedLines;
    }

    let lineStart = 0;
    let lineIndex = 0;

    for (let i = 0; i <= text.length; i++) {
        const atEnd = i === text.length;
        const isNewline = !atEnd && text[i] === "\n";
        if (isNewline || atEnd) {
            if (overlapsProtectedRange(lineStart, i, protectedRanges)) {
                protectedLines.add(lineIndex);
            }

            lineStart = i + 1;
            lineIndex++;
        }
    }

    return protectedLines;
}
