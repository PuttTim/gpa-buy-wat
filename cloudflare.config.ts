import { defineConfig } from "cf/config"

export default defineConfig({
    accountId: "4fa94baca5a3f58345adebb308522279",
    worker: {
        name: "gpa-buy-wat",
        compatibilityDate: "2026-10-23",
        domains: ["gpabuywhat.com", "www.gpabuywhat.com"],
        observability: { enabled: true },
        assets: { notFoundHandling: "single-page-application" },
    },
})
