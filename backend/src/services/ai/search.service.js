
// Helper fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// 1. Wikipedia Search (Vietnamese Wikipedia)
export async function searchWikipedia(query) {
  try {
    const url = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.query?.search || [];
    return items.map((item) => ({
      title: item.title,
      snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, ""),
      url: `https://vi.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
      source: "Wikipedia"
    }));
  } catch (error) {
    console.error("Wikipedia search error:", error);
    return [];
  }
}

// 2. Arxiv Search
export async function searchArxiv(query) {
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=3`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const xmlText = await res.text();
    
    // Regex parsing to avoid XML dependency issue
    const entries = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entryContent = match[1];
      const titleMatch = entryContent.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entryContent.match(/<summary>([\s\S]*?)<\/summary>/);
      const idMatch = entryContent.match(/<id>([\s\S]*?)<\/id>/);
      
      const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") : "Untitled Arxiv Paper";
      const snippet = summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, " ") : "";
      const paperUrl = idMatch ? idMatch[1].trim() : "";
      
      entries.push({
        title,
        snippet: snippet.length > 200 ? snippet.substring(0, 200) + "..." : snippet,
        url: paperUrl,
        source: "Arxiv"
      });
    }
    return entries;
  } catch (error) {
    console.error("Arxiv search error:", error);
    return [];
  }
}

// 3. Semantic Scholar Search
export async function searchSemanticScholar(query) {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=3&fields=title,url,abstract,authors,year`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    const papers = data.data || [];
    return papers.map((paper) => {
      const authorList = paper.authors?.map(a => a.name).join(", ") || "Unknown Author";
      const snippet = paper.abstract || `Paper published in ${paper.year || "unknown year"} by ${authorList}.`;
      return {
        title: paper.title,
        snippet: snippet.length > 200 ? snippet.substring(0, 200) + "..." : snippet,
        url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
        source: "Semantic Scholar"
      };
    });
  } catch (error) {
    console.error("Semantic Scholar search error:", error);
    return [];
  }
}

// 4. Crossref Search
export async function searchCrossref(query) {
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=3`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.message?.items || [];
    return items.map((item) => {
      const title = item.title?.[0] || "Crossref Document";
      const authors = item.author?.map(a => `${a.given || ""} ${a.family || ""}`.trim()).join(", ") || "Unknown";
      const publisher = item.publisher || item["container-title"]?.[0] || "Crossref Metadata";
      const snippet = `Published by ${publisher}. Author(s): ${authors}. DOI: ${item.DOI || "N/A"}`;
      return {
        title,
        snippet,
        url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ""),
        source: "Crossref"
      };
    });
  } catch (error) {
    console.error("Crossref search error:", error);
    return [];
  }
}

// Master orchestrator for searches
export async function orchestrateSearch(query, options = {}) {
  const { useWeb = false, useScholar = false, deepResearch = false } = options;
  if (!query || (!useWeb && !useScholar)) return { results: [], contextString: "" };

  const searchPromises = [];

  if (useWeb) {
    searchPromises.push(searchWikipedia(query));
  }

  if (useScholar) {
    searchPromises.push(searchSemanticScholar(query));
    searchPromises.push(searchArxiv(query));
    searchPromises.push(searchCrossref(query));
  }

  const resultsList = await Promise.all(searchPromises);
  const flattened = resultsList.flat();

  // Deduplicate by URL or title
  const seen = new Set();
  const uniqueResults = [];
  for (const r of flattened) {
    const identifier = r.url || r.title.toLowerCase();
    if (!seen.has(identifier)) {
      seen.add(identifier);
      uniqueResults.push(r);
    }
  }

  // Format into a context block
  let contextString = "";
  if (uniqueResults.length > 0) {
    contextString = "Các nguồn tìm kiếm tham khảo:\n" + uniqueResults.map((r, index) => {
      return `[${index + 1}] Nguồn: ${r.source}\nTiêu đề: ${r.title}\nNội dung: ${r.snippet}\nĐường dẫn: ${r.url || "N/A"}\n---`;
    }).join("\n");
  }

  return {
    results: uniqueResults,
    contextString
  };
}
