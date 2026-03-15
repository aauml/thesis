// =============================================================================
// SemanticScholar.gs — Proveedor Semantic Scholar v2
// Bueno para: scholars (muy preciso con nombres), papers recientes
// Campo en Queries tab: q_semantic
//
// RATE LIMITS:
//   Sin API key: 1 req/sec compartido (usa con cautela)
//   Con API key: 1 req/sec garantizado — añadir SEMANTIC_API_KEY en Script Properties
//
// API KEY SETUP (recomendado):
//   Project Settings → Script Properties → añadir:
//     Key: SEMANTIC_API_KEY
//     Value: DmqhxgRVk19OWJ13Y3xKM5BcCWJds9VwaFSJSsI5
//
//   El AcademicOrchestrator.gs ya lee este valor automáticamente:
//     var ssKey = props.getProperty('SEMANTIC_API_KEY') || '';
//   y lo pasa a searchSemanticScholar() via opts.ssKey.
//
// CHANGES from v1:
//   + Rate limit handling: 1100ms sleep después de cada llamada exitosa con API key
//     (garantiza cumplimiento del límite 1 req/sec independiente de tiempos de red)
//   + Retry suave: en caso de 429, espera 5s y retorna [] (no bloquea el batch)
//   + Mejor logging: incluye conteo de resultados y tiempo de respuesta
//   + Soporte para campo 'openAccessPdf' para URLs directas de papers abiertos
// =============================================================================

function searchSemanticScholar(term, fromYear, opts) {
  if (!term) return [];

  var apiKey = (opts && opts.ssKey) ? opts.ssKey : '';
  var startTime = Date.now();

  var url = 'https://api.semanticscholar.org/graph/v1/paper/search'
    + '?query=' + encodeURIComponent(term)
    + '&year=' + fromYear + '-'
    + '&limit=3'
    + '&fields=title,authors,year,externalIds,abstract,url,openAccessPdf';

  var headers = {'User-Agent': 'thesis-scanner/2.0 (doctoral research)'};
  if (apiKey) headers['x-api-key'] = apiKey;

  try {
    var resp = UrlFetchApp.fetch(url, {headers: headers, muteHttpExceptions: true});
    var elapsed = Date.now() - startTime;

    // Rate limit: con API key, 1 req/sec garantizado.
    // Dormimos 1100ms DESPUÉS de cualquier llamada para asegurar cumplimiento
    // independiente de cuánto tardó la llamada en sí.
    if (apiKey) {
      Utilities.sleep(Math.max(0, 1100 - elapsed));
    }

    if (resp.getResponseCode() === 429) {
      Logger.log('[SemanticScholar] Rate limited — esperando 5s y continuando');
      Utilities.sleep(5000);
      return [];
    }
    if (resp.getResponseCode() !== 200) {
      Logger.log('[SemanticScholar] HTTP ' + resp.getResponseCode() + ' for: ' + term);
      return [];
    }

    var papers = JSON.parse(resp.getContentText()).data || [];
    Logger.log('[SemanticScholar] "' + term.substring(0, 40) + '" → ' + papers.length + ' resultados (' + elapsed + 'ms)');

    return papers.map(function(p) {
      // Preferir: DOI > openAccessPdf > url > Semantic Scholar page
      var paperUrl;
      if (p.externalIds && p.externalIds.DOI) {
        paperUrl = 'https://doi.org/' + p.externalIds.DOI;
      } else if (p.openAccessPdf && p.openAccessPdf.url) {
        paperUrl = p.openAccessPdf.url;
      } else if (p.url) {
        paperUrl = p.url;
      } else {
        paperUrl = 'https://www.semanticscholar.org/paper/' + (p.paperId || '');
      }

      return {
        url:      paperUrl,
        title:    p.title || '',
        authors:  (p.authors || []).slice(0, 3).map(function(a) { return a.name; }).join('; '),
        year:     p.year || '',
        abstract: p.abstract || ''
      };
    });

  } catch(e) {
    Logger.log('[SemanticScholar] ERR: ' + e.message);
    return [];
  }
}
