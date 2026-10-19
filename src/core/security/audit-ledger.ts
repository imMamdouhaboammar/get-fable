import { createHash } from 'node:crypto';

export interface AuditBlock {
  index: number;
  timestamp: string;
  action: string;
  actor: string;
  payloadHash: string;
  previousHash: string;
  hash: string;
}

export class CryptographicAuditLedger {
  private chain: AuditBlock[] = [];

  constructor() {
    this.createGenesisBlock();
  }

  private createGenesisBlock(): void {
    const genesis: AuditBlock = {
      index: 0,
      timestamp: new Date(0).toISOString(),
      action: 'GENESIS',
      actor: 'SYSTEM',
      payloadHash: '0000000000000000000000000000000000000000000000000000000000000000',
      previousHash: '0',
      hash: '',
    };
    genesis.hash = this.calculateHash(genesis);
    this.chain.push(genesis);
  }

  public append(action: string, actor: string, payload: any): AuditBlock {
    const previousBlock = this.chain[this.chain.length - 1];
    const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    const newBlock: AuditBlock = {
      index: previousBlock.index + 1,
      timestamp: new Date().toISOString(),
      action,
      actor,
      payloadHash,
      previousHash: previousBlock.hash,
      hash: '',
    };
    newBlock.hash = this.calculateHash(newBlock);
    this.chain.push(newBlock);
    return newBlock;
  }

  public verifyIntegrity(): { valid: boolean; compromisedIndex?: number } {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (current.previousHash !== previous.hash) {
        return { valid: false, compromisedIndex: i };
      }

      if (current.hash !== this.calculateHash(current)) {
        return { valid: false, compromisedIndex: i };
      }
    }
    return { valid: true };
  }

  public getChain(): readonly AuditBlock[] {
    return this.chain;
  }

  private calculateHash(block: AuditBlock): string {
    const content = `${block.index}:${block.timestamp}:${block.action}:${block.actor}:${block.payloadHash}:${block.previousHash}`;
    return createHash('sha256').update(content).digest('hex');
  }
}
