import http from 'node:http';
import { ProviderTranslator } from './provider-translator.js';
import { ContextInjector } from './context-injector.js';
import { logInfo, logSuccess, logError } from '../utils.js';

export function startMythosRouterServer(port: number = 8080) {
  const fablePrompt = ContextInjector.getFableSystemPrompt();

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health' || req.url === '/v1/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', mode: 'get-fable request proxy', port }));
      return;
    }

    if (req.method === 'POST' && (req.url === '/v1/chat/completions' || req.url === '/chat/completions')) {
      let bodyStr = '';
      req.on('data', (chunk) => {
        bodyStr += chunk;
      });

      req.on('end', async () => {
        try {
          const body = JSON.parse(bodyStr);
          const normalized = ProviderTranslator.normalizeRequest(body);
          const enriched = ProviderTranslator.injectFableSystemPrompt(normalized, fablePrompt);

          logInfo(`[get-fable router] Enriched request for model: ${enriched.model}`);

          const targetUpstream = process.env.UPSTREAM_OPENAI_URL;

          if (targetUpstream) {
            const upstreamRes = await fetch(targetUpstream, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: req.headers.authorization || '',
              },
              body: JSON.stringify(enriched),
            });

            const data = await upstreamRes.json();
            res.writeHead(upstreamRes.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                id: `chatcmpl-fable-${Date.now()}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: enriched.model,
                choices: [
                  {
                    index: 0,
                    message: {
                      role: 'assistant',
                      content: `[get-fable router] Request for model ${enriched.model} enriched successfully. Set UPSTREAM_OPENAI_URL to forward the request to an upstream endpoint.`,
                    },
                    finish_reason: 'stop',
                  },
                ],
                fableEnriched: true,
                systemPromptBytes: fablePrompt.length,
              })
            );
          }
        } catch (err: any) {
          logError(`Router Error: ${err.message}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found. Use POST /v1/chat/completions' }));
  });

  server.listen(port, () => {
    logSuccess(`get-fable request proxy active on http://localhost:${port}`);
    logInfo(`Post OpenAI-compatible requests to http://localhost:${port}/v1/chat/completions`);
  });
}
