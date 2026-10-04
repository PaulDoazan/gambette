export const CALCS_PICKER_CSS = `
.cp-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ui-rounded, system-ui, sans-serif;
  color: #111;
}
.cp-card {
  width: 92vw;
  max-width: 720px;
  height: 88vh;
  background: #fff8e5;
  border: 2.5px solid #111;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
.cp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 2px solid #111;
  background: #fff8e5;
}
.cp-title {
  font-size: 20px;
  font-weight: 800;
  margin: 0;
}
.cp-close {
  background: #bfe6ff;
  border: 2px solid #111;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
}
.cp-close[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
.cp-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px 16px;
  -webkit-overflow-scrolling: touch;
}
.cp-tabs {
  display: flex;
  gap: 6px;
  padding: 8px 0 12px;
  position: sticky;
  top: 0;
  background: #fff8e5;
  z-index: 1;
  border-bottom: 1px solid rgba(17, 17, 17, 0.15);
}
.cp-tab {
  flex: 1;
  background: #fff;
  border: 2px solid #111;
  border-radius: 8px;
  padding: 8px 6px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  color: #111;
}
.cp-tab-active {
  background: #ffd76a;
}
.cp-section { margin-bottom: 14px; }
.cp-random-row {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 8px 10px;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  border: 2px solid #111;
  border-radius: 8px;
  background: #ffeec2;
  user-select: none;
}
.cp-random-row input[type="checkbox"] {
  width: 22px;
  height: 22px;
  margin-right: 12px;
  accent-color: #ff7a2b;
}
.cp-section-header {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 800;
  padding: 8px 6px;
  cursor: pointer;
  border-bottom: 2px solid #111;
  user-select: none;
  background: #ffeec2;
  border-radius: 6px 6px 0 0;
}
.cp-section-header input[type="checkbox"] {
  width: 22px;
  height: 22px;
  margin-right: 12px;
  accent-color: #ff7a2b;
}
.cp-row {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 4px 6px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  border-bottom: 1px solid rgba(17, 17, 17, 0.15);
  user-select: none;
}
.cp-row:last-child { border-bottom: none; }
.cp-row input[type="checkbox"] {
  width: 22px;
  height: 22px;
  margin-right: 12px;
  accent-color: #ff7a2b;
}
.cp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 2px solid #111;
  background: #fff8e5;
  gap: 12px;
}
.cp-warn {
  color: #b00020;
  font-weight: 700;
  font-size: 14px;
  flex: 1;
}
.cp-back {
  background: #bfe6ff;
  border: 2px solid #111;
  border-radius: 6px;
  padding: 8px 18px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
}
.cp-back[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
`;
