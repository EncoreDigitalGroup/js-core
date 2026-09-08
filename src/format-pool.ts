/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {type CoreConfig, DEFAULT_PARALLEL_WORKERS} from "./core";

export interface ParallelFormatResult {
    filePath: string;
    changed: boolean;
    error?: string;
}

function onceMessage(worker: Worker, shouldResolve: (event: MessageEvent) => boolean = () => true): Promise<MessageEvent> {
    return new Promise((resolve, reject) => {
        const onMessage = (event: MessageEvent) => {
            if (!shouldResolve(event)) {
                return;
            }

            cleanup();
            resolve(event);
        };

        const onError = (event: ErrorEvent) => {
            cleanup();
            reject(new Error(event.message));
        };

        const cleanup = () => {
            worker.removeEventListener("message", onMessage);
            worker.removeEventListener("error", onError);
        };

        worker.addEventListener("message", onMessage);
        worker.addEventListener("error", onError);
    });
}

async function formatOne(
    worker: Worker,
    filePath: string,
    dryRun: boolean,
    onFileStart: (filePath: string) => void,
): Promise<ParallelFormatResult> {
    const result = onceMessage(worker, event => {
        const data = event.data;
        if (data?.type === "start") {
            onFileStart(data.filePath);

            return false;
        }

        return data?.type === "result";
    });

    worker.postMessage({type: "format", filePath, dryRun});

    const data = (await result).data;

    return {
        filePath: data.filePath,
        changed: Boolean(data.changed),
        error: data.error,
    };
}

async function formatWorkerFiles(
    worker: Worker,
    queue: string[],
    dryRun: boolean,
    onFileStart: (filePath: string) => void,
): Promise<ParallelFormatResult[]> {
    const results: ParallelFormatResult[] = [];

    while (true) {
        const filePath = queue.shift();
        if (!filePath) {
            return results;
        }

        results.push(await formatOne(worker, filePath, dryRun, onFileStart));
    }
}

async function initWorker(worker: Worker, config: CoreConfig): Promise<void> {
    const ready = onceMessage(worker);

    worker.postMessage({type: "init", config});

    const event = await ready;
    if (event.data?.type !== "ready") {
        throw new Error("Format worker failed to initialize");
    }
}

export function getParallelWorkerCount(files: string[], config: CoreConfig): number {
    return Math.min(files.length, config.parallel?.workers ?? DEFAULT_PARALLEL_WORKERS);
}

export async function formatFilesInParallel(
    files: string[],
    config: CoreConfig,
    dryRun: boolean,
    onFileStart: (filePath: string) => void,
): Promise<ParallelFormatResult[]> {
    const workerCount = getParallelWorkerCount(files, config);
    const workers: Worker[] = [];
    const filesToFormat = [...files];
    try {
        for (let i = 0; i < workerCount; i++) {
            workers.push(new Worker(new URL("./format-worker.js", import.meta.url).href));
        }

        await Promise.all(workers.map(worker => initWorker(worker, config)));

        const workerResults = await Promise.all(workers.map(worker => formatWorkerFiles(worker, filesToFormat, dryRun, onFileStart)));
        return workerResults.flat();
    } finally {
        for (const worker of workers) {
            worker.terminate();
        }
    }
}

/** Minimum file count before worker startup costs are worthwhile. */
export const MINIMUM_PARALLEL_FILES = 4;