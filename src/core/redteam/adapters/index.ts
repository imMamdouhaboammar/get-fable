import type { AdapterContext, RedTeamToolAdapter, ToolAdapterStatus } from '../types.js';
import { AktoAdapter } from './akto.js';
import { BaseToolAdapter } from './base.js';
import { CyberStrikeAdapter } from './cyberstrike.js';
import { HexStrikeAdapter } from './hexstrike.js';
import { NativeProbeAdapter } from './native.js';
import { PentAGIAdapter } from './pentagi.js';
import { PentestAgentAdapter } from './pentestagent.js';

export {
  AktoAdapter,
  BaseToolAdapter,
  CyberStrikeAdapter,
  HexStrikeAdapter,
  NativeProbeAdapter,
  PentAGIAdapter,
  PentestAgentAdapter,
};

export function getAllAdapters(): RedTeamToolAdapter[] {
  return [
    new NativeProbeAdapter(),
    new HexStrikeAdapter(),
    new AktoAdapter(),
    new CyberStrikeAdapter(),
    new PentAGIAdapter(),
    new PentestAgentAdapter(),
  ];
}

export async function getAdapterStatusMatrix(context?: AdapterContext): Promise<ToolAdapterStatus[]> {
  const adapters = getAllAdapters();
  return await Promise.all(adapters.map((adapter) => adapter.getStatus(context)));
}
