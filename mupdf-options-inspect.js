const fs = require("fs");
const path = require("path");

function findMuPDFSource() {
    const mupdfDir = path.join(
        __dirname,
        "node_modules",
        "mupdf"
    );

    if (!fs.existsSync(mupdfDir)) {
        console.log("MuPDF package not found.");
        return;
    }

    console.log("MuPDF package location:");
    console.log(mupdfDir);

    function searchDirectory(directory) {
        const entries = fs.readdirSync(
            directory,
            { withFileTypes: true }
        );

        for (const entry of entries) {
            const fullPath = path.join(
                directory,
                entry.name
            );

            if (entry.isDirectory()) {
                searchDirectory(fullPath);
                continue;
            }

            if (!/\.(js|mjs|cjs)$/i.test(entry.name)) {
                continue;
            }

            const content = fs.readFileSync(
                fullPath,
                "utf8"
            );

            if (
                content.includes("function ensureOptions") ||
                content.includes("ensureOptions =")
            ) {
                console.log(
                    "\nFound ensureOptions in:"
                );

                console.log(fullPath);

                const lines =
                    content.split(/\r?\n/);

                lines.forEach((line, index) => {
                    if (
                        line.includes("ensureOptions")
                    ) {
                        const start =
                            Math.max(0, index - 5);

                        const end =
                            Math.min(
                                lines.length,
                                index + 30
                            );

                        console.log(
                            "\nRelevant source:\n"
                        );

                        console.log(
                            lines
                                .slice(start, end)
                                .join("\n")
                        );
                    }
                });

                return true;
            }
        }

        return false;
    }

    const found =
        searchDirectory(mupdfDir);

    if (!found) {
        console.log(
            "\nCould not find ensureOptions."
        );
    }
}

findMuPDFSource();