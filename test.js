const text = "Safaricom limited the bundle to specific hours and introduced alternative Pata More options. The move is aimed at managing network congestion during peak hours while ensuring customers still have affordable access to internet services.";

function splitReadableParagraphs(text, targetLength = 360) {
  const sourceParagraphs = text.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const result = [];

  const pushWords = (value) => {
    const words = value.split(/\s+/).filter(Boolean);
    let chunk = "";
    words.forEach((word) => {
      const candidate = chunk ? `${chunk} ${word}` : word;
      if (chunk && candidate.length > targetLength) {
        result.push(chunk);
        chunk = word;
      } else {
        chunk = candidate;
      }
    });
    if (chunk) result.push(chunk);
  };

  sourceParagraphs.forEach((paragraph) => {
    const sentences = paragraph.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [paragraph];
    let chunk = "";

    sentences.forEach((sentence) => {
      if (sentence.length > targetLength) {
        if (chunk) result.push(chunk);
        chunk = "";
        pushWords(sentence);
        return;
      }

      const candidate = chunk ? `${chunk} ${sentence}` : sentence;
      if (chunk && candidate.length > targetLength) {
        result.push(chunk);
        chunk = sentence;
      } else {
        chunk = candidate;
      }
    });

    if (chunk) result.push(chunk);
  });

  return result;
}

console.log(splitReadableParagraphs(text));
console.log(splitReadableParagraphs("Test."));
console.log(splitReadableParagraphs("MARKET INSIGHT."));
