// =============================================================================
// OpenAlex.gs — Proveedor OpenAlex
// Bueno para: scholars, topics con frases exactas, cobertura amplia
// Campo en Queries tab: q_openalex
// =============================================================================

function searchOpenAlex(term, fromYear, opts) {
  if (!term) return [];
  var url = 'https://api.openalex.org/works'
    + '?search=' + encodeURIComponent(term)
    + '&filter=publication_year:>' + (fromYear - 1)
    + '&per-page=3'
    + '&select=id,title,authorships,publication_year,primary_location,abstract_inverted_index'
    + '&mailto=thesis-scanner@academic.local';
  try {
    var resp = UrlFetchApp.fetch(url, {muteHttpExceptions:true});
    if (resp.getResponseCode() !== 200) {
      Logger.log('[OpenAlex] HTTP ' + resp.getResponseCode() + ' for: ' + term);
      return [];
    }
    var works = JSON.parse(resp.getContentText()).results || [];
    return works.map(function(w) {
      var landingUrl = (w.primary_location && w.primary_location.landing_page_url)
        ? w.primary_location.landing_page_url
        : 'https://openalex.org/' + (w.id||'').replace('https://openalex.org/','');
      return {
        url:      landingUrl,
        title:    w.title || '',
        authors:  (w.authorships||[]).slice(0,3)
                    .map(function(a){return a.author?a.author.display_name:'';}).filter(Boolean).join('; '),
        year:     w.publication_year || '',
        abstract: _openAlexDecodeAbstract(w.abstract_inverted_index)
      };
    });
  } catch(e) {
    Logger.log('[OpenAlex] ERR: ' + e.message);
    return [];
  }
}

function _openAlexDecodeAbstract(inv) {
  if (!inv) return '';
  var words = [];
  Object.keys(inv).forEach(function(word){
    inv[word].forEach(function(pos){ words[pos] = word; });
  });
  return words.filter(Boolean).join(' ');
}