/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import "reflect-metadata";
import {Container, CoreConfig, FormatterPipeline, ServiceRegistration} from "./core";

let pipeline: FormatterPipeline | undefined;

declare var self: Worker;
self.onmessage = async (event: MessageEvent) => {
    const data = event.data;
    if (data.type === "init") {
        const container = new Container();
        ServiceRegistration.registerServices(container, data.config as CoreConfig);
        pipeline = container.resolve<FormatterPipeline>("FormatterPipeline");
        postMessage({type: "ready"});

        return;
    }

    if (data.type === "format") {
        if (!pipeline) {
            postMessage({type: "result", filePath: data.filePath, changed: false, error: "Worker not initialized"});

            return;
        }
        try {
            postMessage({type: "start", filePath: data.filePath});

            const context = await pipeline.formatFile(data.filePath, data.dryRun);
            postMessage({type: "result", filePath: data.filePath, changed: context.changed});
        } catch (error) {
            postMessage({
                type: "result",
                filePath: data.filePath,
                changed: false,
                error: (error as Error).message,
            });
        }
    }
};