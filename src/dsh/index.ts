import { createFableApiHandler } from './api.js';
import type { FableDshConfig } from './types.js';

export const name = 'get-fable';
export const inject = ['webServer'];

export interface CordisContext {
  webServer?: {
    register?: (route: { kind: string; path: string; handler: (req: any, res: any) => void | Promise<void> }) => any;
    get?: (path: string, handler: (req: any, res: any) => void | Promise<void>) => void;
    post?: (path: string, handler: (req: any, res: any) => void | Promise<void>) => void;
  };
  get?: (key: string) => any;
  sessionProjections?: {
    register: (name: string, definition: any) => void;
  };
  on?: (event: string, listener: (...args: any[]) => void) => void;
}

function sendJson(res: any, data: any, statusCode: number = 200) {
  if (typeof res.status === 'function') {
    res.status(statusCode);
  } else if ('statusCode' in res) {
    res.statusCode = statusCode;
  }

  if (typeof res.json === 'function') {
    res.json(data);
    return;
  }

  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  } else if (typeof res.writeHead === 'function') {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  }

  if (typeof res.end === 'function') {
    res.end(JSON.stringify(data));
  } else if (typeof res.send === 'function') {
    res.send(JSON.stringify(data));
  }
}

async function parseBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  try {
    const chunks: any[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export function apply(ctx: CordisContext, config: FableDshConfig = {}): void {
  const projectRoot = config.projectRoot || process.cwd();
  const api = createFableApiHandler(projectRoot);
  const server = ctx.webServer || (typeof ctx.get === 'function' ? ctx.get('webServer') : undefined);

  if (server) {
    const registerRoute = (method: 'GET' | 'POST', routePath: string, handler: (req: any, res: any, body: any) => Promise<void>) => {
      if (typeof server.register === 'function') {
        server.register({
          kind: 'exact',
          path: routePath,
          handler: async (req: any, res: any) => {
            if (req.method && req.method.toUpperCase() !== method) {
              if (typeof res.writeHead === 'function') {
                res.writeHead(405, { allow: method });
              } else if (typeof res.status === 'function') {
                res.status(405);
              }
              res.end?.(JSON.stringify({ error: `Method ${req.method} not allowed` }));
              return;
            }
            const body = method === 'POST' ? await parseBody(req) : {};
            await handler(req, res, body);
          }
        });
      } else if (method === 'GET' && typeof server.get === 'function') {
        server.get(routePath, async (req: any, res: any) => {
          await handler(req, res, {});
        });
      } else if (method === 'POST' && typeof server.post === 'function') {
        server.post(routePath, async (req: any, res: any) => {
          const body = await parseBody(req);
          await handler(req, res, body);
        });
      }
    };

    // GET /api/fable/status
    registerRoute('GET', '/api/fable/status', async (_req, res) => {
      try {
        const status = api.getStatus();
        sendJson(res, status, 200);
      } catch (err: any) {
        sendJson(res, { error: err.message || 'Failed to get Fable status' }, 500);
      }
    });

    // GET /api/fable/plan
    registerRoute('GET', '/api/fable/plan', async (_req, res) => {
      try {
        const plan = api.getPlan();
        sendJson(res, plan, 200);
      } catch (err: any) {
        sendJson(res, { error: err.message || 'Failed to get plan' }, 500);
      }
    });

    // GET /api/fable/skills
    registerRoute('GET', '/api/fable/skills', async (_req, res) => {
      try {
        const skills = api.getSkills();
        sendJson(res, skills, 200);
      } catch (err: any) {
        sendJson(res, { error: err.message || 'Failed to get skills' }, 500);
      }
    });

    // POST /api/fable/route
    registerRoute('POST', '/api/fable/route', async (_req, res, body) => {
      try {
        const task = body?.task || '';
        const applyFlag = Boolean(body?.apply);

        if (!task.trim()) {
          return sendJson(res, { error: 'Task description is required' }, 400);
        }

        const result = applyFlag ? api.postRouteAndApply(task) : api.postRoute(task, body?.state);
        sendJson(res, result, 200);
      } catch (err: any) {
        sendJson(res, { error: err.message || 'Routing failed' }, 500);
      }
    });

    // POST /api/fable/doctor
    registerRoute('POST', '/api/fable/doctor', async (_req, res, body) => {
      try {
        const fix = Boolean(body?.fix);
        const report = api.postDoctor(fix);
        sendJson(res, report, 200);
      } catch (err: any) {
        sendJson(res, { error: err.message || 'Doctor run failed' }, 500);
      }
    });
  }

  // Session Projection for DSH web UI
  const registerProjections = (pCtx: any) => {
    const projections = pCtx?.sessionProjections || (typeof pCtx?.get === 'function' ? pCtx.get('sessionProjections') : undefined);
    if (!projections?.register) return;
    try {
      projections.register('fableDiscipline', {
        name: 'Fable Discipline',
        description: 'Real-time Fable lifecycle state and file planning tracker',
        resolve: () => api.getStatus(),
      });
    } catch {
      // safe fallback if projection register signature varies
    }
  };

  if (typeof (ctx as any).inject === 'function') {
    (ctx as any).inject(['sessionProjections'], registerProjections);
  } else if ((ctx as any).sessionProjections) {
    registerProjections(ctx);
  }
}

export * from './types.js';
export * from './api.js';
