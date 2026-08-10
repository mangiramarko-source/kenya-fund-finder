function cleanTitleText(rawTitle) {
  if (!rawTitle) return "";
  return rawTitle
    .replace(/\s*[-–|]\s*[a-z0-9.-]+\.[a-z]{2,}$/i, '')
    .replace(/\s*[-–|]\s*(Business Daily|Nation|The Star|Standard|Capital FM|TechCabal|TechWeez|Kenyan Wall Street|Citizen Digital|KBC|People Daily)\s*$/i, '')
    .trim();
}

function cleanContentText(title, rawContent) {
  if (!rawContent) return "";
  let content = rawContent.trim();
  
  const baseTitle = cleanTitleText(title);
  if (baseTitle) {
    const normTitle = baseTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normContent = content.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normTitle.length >= 15 && normContent.startsWith(normTitle)) {
      // Find the index in 'content' where the matching alphanumeric characters end
      let matchCount = 0;
      let splitIndex = 0;
      for (let i = 0; i < content.length; i++) {
        if (/[a-z0-9]/i.test(content[i])) {
          matchCount++;
        }
        if (matchCount === normTitle.length) {
          splitIndex = i + 1;
          break;
        }
      }

      let remainder = content.slice(splitIndex).trim();
      // Remove any leftover punctuation or domain suffix at the start of the remainder
      remainder = remainder.replace(/^[^a-z0-9]+/i, '').trim(); 
      remainder = remainder.replace(/^[a-z0-9.-]+\.[a-z]{2,}\s*/i, '').trim();
      
      if (remainder.length > 0) {
        content = remainder;
      } else {
        // If the remainder is empty, it means the content was EXACTLY the title (or title + domain)
        // In this case, we don't want to show an empty string, maybe we just show nothing?
        // Wait, if content is exactly the title, and we already show the title in h3, we should return empty string.
        // But if title is NOT shown (if we removed it), then we should return the clean title.
        // But the user asked to put the title back! So we should return empty string or just let it be empty so no duplicate is shown.
        content = "";
      }
    }
  }

  content = content.replace(/^[a-z0-9.-]+\.[a-z]{2,}\s*[-–|]?\s*/i, '').trim();
  return content;
}

const title = "Former PS takes top stake in Middle East Bank Kenya.";
const summary = "Former PS takes top stake in Middle East Bank Kenya businessdailyafrica.com";

console.log("cleanTitle:", cleanTitleText(title));
console.log("cleanContent:", cleanContentText(title, summary));
