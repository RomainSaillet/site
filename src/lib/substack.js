/**
 * Utilitaire de fetch et parse du flux RSS Substack.
 * Renvoie un tableau vide si le flux est indisponible.
 */

function extractCDATA(str) {
  if (!str) return '';
  const m = str.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1].trim() : str.trim();
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>'));
  return m ? extractCDATA(m[1]) : '';
}

function extractLink(item) {
  const m = item.match(/<link>([^<]+)<\/link>/);
  if (m) return m[1].trim();
  const g = item.match(/<guid[^>]*>([^<]+)<\/guid>/);
  return g ? g[1].trim() : '';
}

function extractImage(item) {
  const enc = item.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image/);
  if (enc) return enc[1];
  const med = item.match(/<media:content[^>]+url="([^"]+)"/);
  if (med) return med[1];
  const block = item.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/)
             ?? item.match(/<description>([\s\S]*?)<\/description>/);
  if (block) {
    const html = extractCDATA(block[1]);
    const img  = html.match(/<img[^>]+src="([^"]+)"/);
    if (img) return img[1];
  }
  return '';
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ')
             .replace(/&[a-z#0-9]+;/gi, ' ')
             .replace(/\s+/g, ' ')
             .trim();
}

function formatDate(raw) {
  try {
    return new Date(raw).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  } catch (_) { return ''; }
}

export async function getSubstackPosts(feedUrl, limit = 5) {
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'romainsaillet.com' }
    });
    if (!res.ok) return [];
    const xml   = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

    return items.slice(0, limit).map(item => ({
      title      : extractTag(item, 'title'),
      link       : extractLink(item),
      date       : formatDate(extractTag(item, 'pubDate')),
      description: stripHtml(extractTag(item, 'description')).slice(0, 180),
      image      : extractImage(item),
    })).filter(p => p.title && p.link);

  } catch (_) {
    return [];
  }
}
