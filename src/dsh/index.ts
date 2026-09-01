import { createFableApiHandler } from './api.js';
import type { FableDshConfig } from './types.js';

export const name = 'get-fable';
export const inject = ['webServer'];

export interface CordisContext {
  webServer?: {
    get: (path: string, handler: (req: any, res: any) => void | Promise<void>) => void;
    post: (path: string, handler: (req: any, res: any) => void | Promise<void>) => void;
  };
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
  }

  if (typeof res.end === 'function') {
    res.end(JSON.stringify(data));
  } else if (typeof res.send === 'function') {
    res.send(JSON.stringify(data));
  }
}

export function apply(ctx: CordisContext, config: FableDshConfig = {}): void {
  const projectRoot = config.projectRoot || process.cwd();
  const api = createFableApiHandler(projectRoot);

  if (ctx.webServer) {
    // GET /api/fable/status
    ctx.webServer.get('/api/fable/status', async (_req: any, res: any) => {
      try {
        const status = api.getStatus();
        sendJson(res, status, 200);
      } catch (err: any) {
        sendJson(res, { error: err.message || 'Failed to get Fable status' }, 500);
      }
    });

    // GET /api/fable/plan
    ctx.webServer.get('/api/fable/plan', async (_req: any, res: any) => {
      try {
        const plan = api.getPlan();
        sendJson(res, plan, 200);
      } catch (err: any) {
        sendJson(res, { error: err.message || 'Failed to get plan' }, 500);
      }
    });

    // GET /api/fable/skills
    ctx.webServer.get('/api/fable/skills', async (_req: any, res: any) => {
      try {
        const skills = api.getSkills();
        sendJson(res, skills, 200);
      } catch (err: any) {
        sendJson(res, { error: err.message || 'Failed to get skills' }, 500);
      }
    });

    // POST /api/fable/route
    ctx.webServer.post('/api/fable/route', async (req: any, res: any) => {
      try {
        const body = req.body || {};
        const task = body.task || '';
        const applyFlag = Boolean(body.apply);

        if (!task.trim()) {
          return sendJson(res, { error: 'Task description is required' }, 400);
        }

        const result = applyFlag ? api.postRouteAndApply(task) : api.postRoute(task, body.state);
        sendJson(res, result, 200);
      } catch (err: any) {
        sendJson(res, { error: err.message || 'Routing failed' }, 500);
      }
    });

    // POST /api/fable/doctor
    ctx.webServer.post('/api/fable/doctor', async (req: any, res: any) => {
      try {
        const body = req.body || {};
        const fix = Boolean(body.fix);
        const report = api.postDoctor(fix);
        sendJson(res, report, 200);
      } catch (err: any) {
        sendJson(res, { error: err.message || 'Doctor run failed' }, 500);
      }
    });
  }

  // Session Projection for DSH web UI
  if (ctx.sessionProjections) {
    try {
      ctx.sessionProjections.register('fableDiscipline', {
        name: 'Fable Discipline',
        description: 'Real-time Fable lifecycle state and file planning tracker',
        resolve: () => api.getStatus(),
      });
    } catch {
      // safe fallback if projection register signature varies
    }
  }
}

export * from './types.js';
export * from './api.js';
