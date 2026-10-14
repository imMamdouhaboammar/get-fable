export interface JsonEnvelope<T> {
  schema_version: number;
  command: string;
  ok: boolean;
  result?: T;
  warnings: string[];
  errors: Array<{
    code: string;
    message: string;
    capability_ids?: string[];
    operation_id?: string | null;
    remediation?: string[];
  }>;
}

export interface EcoMachineFacts {
  os: { status: string; value?: string };
  arch: { status: string; value?: string };
  runtimes: Array<{ name: string; path?: string; version?: string }>;
  hosts: Array<{ id: string; config_dir?: string; installed: boolean; version?: string }>;
}

export interface EcoProjectBinding {
  schema_version: number;
  profile?: string | null;
  capabilities: string[];
  policy: string;
  hosts: string[];
  provider_preferences: Record<string, string>;
  minimum_contract_version: number;
}
