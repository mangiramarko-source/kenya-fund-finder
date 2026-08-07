const DOMParserCtor = (globalThis as any).DOMParser;
console.log(DOMParserCtor ? "DOMParser is defined" : "DOMParser is NOT defined");
