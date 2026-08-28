import { describe, expect, test } from 'bun:test';
import {
  loadNeuralGraph,
  getNeuralConnections,
  validateNeuralGraph,
  renderNeuralGraphAscii,
} from '../src/core/neural-linking.ts';

describe('Fable Neural Linking System', () => {
  test('loads neural graph with 25 nodes and validated connections', () => {
    const graph = loadNeuralGraph();
    expect(graph.nodes.length).toBe(25);
    expect(graph.edges.length).toBeGreaterThanOrEqual(30);

    const validation = validateNeuralGraph(graph);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  test('resolves precursors, continuations, peers, and recovery for any skill', () => {
    const executeConn = getNeuralConnections('fable-execute');
    expect(executeConn.precursors).toContain('fable-plan');
    expect(executeConn.precursors).toContain('fable-tdd');
    expect(executeConn.continuations).toContain('fable-verify');
    expect(executeConn.recovery).toBe('fable-recover');

    const verifyConn = getNeuralConnections('fable-verify');
    expect(verifyConn.precursors).toContain('fable-execute');
    expect(verifyConn.continuations).toContain('fable-release');
    expect(verifyConn.continuations).toContain('fable-review');
    expect(verifyConn.recovery).toBe('fable-recover');

    const creatorConn = getNeuralConnections('fable-skill-creator');
    expect(creatorConn.continuations).toContain('fable-eval');
    expect(creatorConn.continuations).toContain('fable-verify');
  });

  test('renders interactive ASCII graph representation', () => {
    const skillAscii = renderNeuralGraphAscii('fable-verify');
    expect(skillAscii).toContain('Neural Knowledge Graph: fable-verify');
    expect(skillAscii).toContain('[Active Node: fable-verify]');
    expect(skillAscii).toContain('[Continuations]');

    const fullAscii = renderNeuralGraphAscii();
    expect(fullAscii).toContain('Fable Full Neural Graph');
    expect(fullAscii).toContain('fable-skill-creator');
  });
});
