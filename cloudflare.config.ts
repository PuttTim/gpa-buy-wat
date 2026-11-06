import { bindings, defineConfig, exports } from "cf/config"

export default defineConfig({
    accountId: "4fa94baca5a3f58345adebb308522279",
    worker: {
        name: "gpa-buy-wat",
        compatibilityDate: "2026-10-23",
        entrypoint: "./worker/index.ts",
        domains: ["gpabuywhat.com", "www.gpabuywhat.com"],
        previewUrls: true,
        observability: { enabled: true },
        assets: {
            notFoundHandling: "single-page-application",
            runWorkerFirst: ["/api/*"],
        },
        exports: {
            GPABuyWhatImports: exports.durableObject({ storage: "sqlite" }),
        },
        env: {
            IMPORTS: bindings.durableObject({ worker: "gpa-buy-wat", exportName: "GPABuyWhatImports" }),
            // Per IP. A page opens one socket, plus a reconnect each time the tab comes back.
            CONNECT_LIMIT: bindings.rateLimit({ namespace: "1001", simple: { limit: 60, period: 60 } }),
            PULL_LIMIT: bindings.rateLimit({ namespace: "1002", simple: { limit: 20, period: 60 } }),
        },
    },
})
