import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { HOME_PAGE, Page, pageUrl, SCHOOL_PAGES, SITE_URL } from "./src/lib/pages"

const applyPage = (html: string, page: Page) => {
    const replacements: [RegExp, string][] = [
        [/<title>.*?<\/title>/, `<title>${page.title}</title>`],
        [/(<meta name="description" content=")[^"]*/, `$1${page.description}`],
        [/(<link rel="canonical" href=")[^"]*/, `$1${pageUrl(page)}`],
        [/(<meta property="og:url" content=")[^"]*/, `$1${pageUrl(page)}`],
        [/(<meta property="og:title" content=")[^"]*/, `$1${page.title}`],
        [/(<meta name="twitter:title" content=")[^"]*/, `$1${page.title}`],
    ]
    return replacements.reduce((result, [pattern, value]) => {
        if (!pattern.test(result)) throw new Error(`index.html is missing ${pattern}`)
        return result.replace(pattern, value)
    }, html)
}

/** Writes an HTML file per school, plus the sitemap crawlers need to find them. */
const prerenderPages = (): Plugin => ({
    name: "prerender-pages",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
        const index = bundle["index.html"]
        if (index?.type !== "asset") return
        for (const page of SCHOOL_PAGES) {
            this.emitFile({
                type: "asset",
                // "nus.html" serves at /nus; "nus/index.html" would redirect to /nus/.
                fileName: `${page.path.slice(1)}.html`,
                source: applyPage(String(index.source), page),
            })
        }
        const urls = [HOME_PAGE, ...SCHOOL_PAGES]
            .map(page => `  <url><loc>${pageUrl(page)}</loc></url>`)
            .join("\n")
        this.emitFile({
            type: "asset",
            fileName: "sitemap.xml",
            source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        })
        this.emitFile({
            type: "asset",
            fileName: "robots.txt",
            source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
        })
    },
})

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss(), cloudflare(), prerenderPages()],
    resolve: {
        alias: { "@": `${import.meta.dirname}/src` },
    },
})
