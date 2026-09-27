async function testMuPDF() {
    const mupdf = await import("mupdf");

    console.log(Object.keys(mupdf));
}

testMuPDF();