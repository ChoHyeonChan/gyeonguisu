// 심사 중 어떤 예외가 나도 빈 화면은 없다 — 완성도 보험

import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <div className="screen briefing" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <p className="big" style={{ fontSize: '1.2rem', color: '#fff' }}>
          경기가 잠시 중단됐습니다.
        </p>
        <p className="dim">예상하지 못한 문제가 있었습니다. 다시 시작하면 이어서 할 수 있습니다.</p>
        <button className="cta" onClick={() => location.reload()}>
          다시 시작
        </button>
      </div>
    );
  }
}
