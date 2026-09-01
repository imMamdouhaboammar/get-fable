export const FABLE_CSS = `
.fable-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 1080px;
  color: var(--dsw-alias-label-primary, #ffffff);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.fable-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--dsw-alias-bg-layer-2, #1a1b1e);
  border: 1px solid var(--dsw-alias-border-l2, #2e3035);
  border-radius: 12px;
}

.fable-title-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fable-logo {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #fff;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.fable-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}

.fable-subtitle {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #9ca3af);
}

.fable-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fable-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fable-badge-phase {
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.4);
  color: #818cf8;
}

.fable-badge-mode {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
}

.fable-badge-warn {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
}

.fable-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.fable-stat-card {
  background: var(--dsw-alias-bg-layer-2, #1a1b1e);
  border: 1px solid var(--dsw-alias-border-l2, #2e3035);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fable-stat-label {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #9ca3af);
  text-transform: uppercase;
  font-weight: 500;
}

.fable-stat-val {
  font-size: 20px;
  font-weight: 700;
  color: var(--dsw-alias-label-primary, #ffffff);
}

.fable-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, #2e3035);
  padding-bottom: 8px;
}

.fable-tab-btn {
  background: transparent;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  color: var(--dsw-alias-label-secondary, #9ca3af);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.fable-tab-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, #27282d);
  color: var(--dsw-alias-label-primary, #ffffff);
}

.fable-tab-btn.active {
  background: var(--dsw-alias-interactive-bg-hover, #27282d);
  color: #818cf8;
  font-weight: 600;
}

.fable-card-body {
  background: var(--dsw-alias-bg-layer-2, #1a1b1e);
  border: 1px solid var(--dsw-alias-border-l2, #2e3035);
  border-radius: 10px;
  padding: 18px;
}

.fable-phase-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fable-phase-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--dsw-alias-bg-layer-1, #121316);
  border: 1px solid var(--dsw-alias-border-l2, #2e3035);
  border-radius: 8px;
}

.fable-phase-name {
  font-size: 13px;
  font-weight: 500;
}

.fable-status-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
}

.fable-status-complete {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.fable-status-in_progress {
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
}

.fable-status-pending {
  background: rgba(156, 163, 175, 0.2);
  color: #9ca3af;
}

.fable-skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.fable-skill-card {
  background: var(--dsw-alias-bg-layer-1, #121316);
  border: 1px solid var(--dsw-alias-border-l2, #2e3035);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: transform 0.1s ease, border-color 0.1s ease;
}

.fable-skill-card:hover {
  border-color: #6366f1;
  transform: translateY(-1px);
}

.fable-skill-name {
  font-size: 13px;
  font-weight: 600;
  color: #818cf8;
}

.fable-skill-desc {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #9ca3af);
  line-height: 1.4;
}

.fable-router-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fable-input {
  width: 100%;
  padding: 10px 14px;
  background: var(--dsw-alias-bg-layer-1, #121316);
  border: 1px solid var(--dsw-alias-border-l2, #2e3035);
  border-radius: 8px;
  color: var(--dsw-alias-label-primary, #ffffff);
  font-size: 13px;
  outline: none;
}

.fable-input:focus {
  border-color: #6366f1;
}

.fable-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.fable-btn:hover {
  opacity: 0.9;
}

.fable-btn-secondary {
  background: var(--dsw-alias-bg-layer-1, #121316);
  border: 1px solid var(--dsw-alias-border-l2, #2e3035);
  color: var(--dsw-alias-label-primary, #ffffff);
}

.fable-btn-secondary:hover {
  background: var(--dsw-alias-interactive-bg-hover, #27282d);
}

.fable-widget-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 16px;
  background: var(--dsw-alias-bg-layer-2, #1a1b1e);
  border: 1px solid var(--dsw-alias-border-l2, #2e3035);
  color: var(--dsw-alias-label-primary, #ffffff);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
}

.fable-widget-pill:hover {
  border-color: #6366f1;
  background: var(--dsw-alias-interactive-bg-hover, #27282d);
}

.fable-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
}

.fable-dot-warn {
  background: #ef4444;
  animation: fable-pulse 1.5s infinite;
}

@keyframes fable-pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}
`;
