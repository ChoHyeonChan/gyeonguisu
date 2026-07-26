// 사운드 — 외부 파일 없이 Web Audio로 전부 합성한다.
// 저작권 원천 무결 + 로딩 0바이트. 모바일 오토플레이 정책 대응: 첫 사용자 제스처에서 unlock().
// 소음 컷(결정의 순간)은 이 게임의 서명 연출이다. 무음 환경 대비 시각 신호는 UI가 병행한다.

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private crowd: GainNode | null = null;
  enabled = true;

  /** 첫 탭에서 호출 — 이후 호출은 무해 */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 1 : 0;
      this.master.connect(this.ctx.destination);

      // 관중 웅성거림: 브라운 노이즈 루프 → 로우패스 → 게인
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        d[i] = last * 3.5;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 480;
      this.crowd = this.ctx.createGain();
      this.crowd.gain.value = 0;
      src.connect(lp).connect(this.crowd).connect(this.master);
      src.start();

      // 웅성거림이 살아있게 느껴지도록 완만한 랜덤 스웰 (앱 수명 동안 유지)
      window.setInterval(() => {
        if (!this.ctx || !this.crowd) return;
        const base = this.crowd.gain.value;
        if (base < 0.02) return; // 컷 상태면 건드리지 않는다
        const target = 0.08 + Math.random() * 0.05;
        this.crowd.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 2.5);
      }, 3000);
    } catch {
      this.ctx = null; // 미지원 환경 — 전부 무음 무해
    }
  }

  private ramp(v: number, sec: number) {
    if (!this.ctx || !this.crowd) return;
    this.crowd.gain.cancelScheduledValues(this.ctx.currentTime);
    this.crowd.gain.setValueAtTime(this.crowd.gain.value, this.ctx.currentTime);
    this.crowd.gain.linearRampToValueAtTime(v, this.ctx.currentTime + sec);
  }

  ambient() { this.ramp(0.1, 1.2); }
  /** 결정의 순간 — 관중 소음 컷 */
  cut() { this.ramp(0.0, 0.35); }
  resumeAmbient() { this.ramp(0.1, 0.9); }

  /** 득점 함성: 대역 노이즈 버스트 + 군중 스웰 */
  roar() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const len = this.ctx.sampleRate * 1.6;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 1.7);
    this.ramp(0.16, 0.3);
    setTimeout(() => this.ramp(0.1, 2), 2200);
  }

  /** 실점 — 함성이 뚝 꺼지고 낮은 술렁임 */
  groan() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 1.1);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 1.3);
    this.ramp(0.03, 0.25);
    setTimeout(() => this.ramp(0.1, 3), 2500);
  }

  /** 종료 휘슬: 삑-삑-삐이익 */
  whistle() {
    if (!this.ctx || !this.master) return;
    const beep = (at: number, dur: number) => {
      const o = this.ctx!.createOscillator();
      o.type = 'square';
      o.frequency.value = 2350;
      const v = this.ctx!.createOscillator();
      v.type = 'sine';
      v.frequency.value = 40; // 트릴
      const vg = this.ctx!.createGain();
      vg.gain.value = 300;
      v.connect(vg).connect(o.frequency);
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(this.master!);
      o.start(at);
      o.stop(at + dur + 0.05);
      v.start(at);
      v.stop(at + dur + 0.05);
    };
    const t = this.ctx.currentTime;
    beep(t, 0.25);
    beep(t + 0.35, 0.25);
    beep(t + 0.7, 0.9);
    this.ramp(0.14, 0.5);
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.ctx && this.master) {
      this.master.gain.linearRampToValueAtTime(this.enabled ? 1 : 0, this.ctx.currentTime + 0.2);
    }
    return this.enabled;
  }
}

export const audio = new AudioEngine();
