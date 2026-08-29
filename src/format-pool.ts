/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import * as os from "os";
import type {CoreConfig} from "./core";

export interface ParallelFormatResult {
    filePath: string;
    changed: boolean;
    error?: string;
}

function onceMessage(worker: Worker): Promise<MessageEvent> {
    return new Promise((resolve, reject) => {
        const onMessage = (event: MessageEvent) => {
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

async function formatOne(worker: Worker, filePath: string, dryRun: boolean): Promise<ParallelFormatResult> {
    worker.postMessage({type: "format", filePath, dryRun});

    const event = await onceMessage(worker);
    const data = event.data;
    if (data?.type !== "result") {
        return {filePath, changed: false, error: "Format worker returned an unexpected message"};
    }

    return {
        filePath: data.filePath,
        changed: Boolean(data.changed),
        error: data.error,
    };
}

async function initWorker(worker: Worker, config: CoreConfig): Promise<void> {
    worker.postMessage({type: "init", config});

    const event = await onceMessage(worker);
    if (event.data?.type !== "ready") {
        throw new Error("Format worker failed to initialize");
    }
}

export async function formatFilesInParallel(
    files: string[],
    config: CoreConfig,
    dryRun: boolean,
): Promise<ParallelFormatResult[]> {
    const workerCount = Math.max(1, Math.min(files.length, os.cpus().length || 1));
    const workers: Worker[] = [];
    const queue = [...files];
    const results: ParallelFormatResult[] = [];
    try {
        for (let i = 0; i < workerCount; i++) {
            workers.push(new Worker(new URL("./format-worker.js", import.meta.url).href));
        }

        await Promise.all(workers.map(worker => initWorker(worker, config)));
        await Promise.all(workers.map(async worker => {
            while (queue.length > 0) {
                const filePath = queue.shift();
                if (!filePath) {
                    return;
                }

                results.push(await formatOne(worker, filePath, dryRun));
            }
        }));

        return results;
    } finally {
        for (const worker of workers) {
            worker.terminate();
        }
    }
}