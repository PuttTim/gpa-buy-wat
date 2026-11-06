import { GitHubIcon } from "./GitHubIcon"

const authors = [
    { name: "Nas", url: "https://github.com/Coeeter/" },
    { name: "Nitish", url: "https://github.com/TechSupportz" },
    { name: "Putt", url: "https://github.com/PuttTim" },
]

const Footer = () => (
    <footer className="mt-8 border-t pb-[env(safe-area-inset-bottom,0px)] text-sm text-muted-foreground lg:mt-12">
        <div className="m-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-4 lg:px-6">
            <p>
                Made with ❤️ by{" "}
                {authors.map((author, index) => (
                    <span key={author.name}>
                        {index > 0 && ", "}
                        <a
                            className="hover:text-foreground"
                            href={author.url}
                            target="_blank"
                            rel="noreferrer">
                            {author.name}
                        </a>
                    </span>
                ))}
            </p>
            <a
                aria-label="GitHub repository"
                className="shrink-0 hover:text-foreground"
                href="https://github.com/PuttTim/gpa-buy-wat"
                target="_blank"
                rel="noreferrer">
                <GitHubIcon />
            </a>
        </div>
    </footer>
)

export default Footer
