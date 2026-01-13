/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { CoreConfig } from "../config";
import { FormatterPipeline } from "../pipeline";
import { IServiceContainer } from "./IServiceContainer";

/**
 * Registers all services with the DI container using the clean API
 */
export class ServiceRegistration {
    /**
     * Register all core services and formatter rules
     * @param container - Service container to register services with
     * @param config - Application configuration
     */
    static registerServices(container: IServiceContainer, config: CoreConfig): void {
        // Register configuration using clean API
        container.singleton<CoreConfig>(config);

        // Register the container itself for services that need it
        container.singleton<IServiceContainer>(container);

        // Register pipeline using clean API - it will register its own rules
        container.singleton<FormatterPipeline>(() => {
            const configInstance = container.resolve<CoreConfig>();
            return new FormatterPipeline(configInstance, container);
        });
    }
}