// 사운드 — 외부 파일 없이 Web Audio로 전부 합성한다.
// 저작권 원천 무결 + 로딩 0바이트. 모바일 오토플레이 정책 대응: 첫 사용자 제스처에서 unlock().
// 소음 컷(결정의 순간)은 이 게임의 서명 연출이다. 무음 환경 대비 시각 신호는 UI가 병행한다.

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private crowd: GainNode | null = null;
  private drn: GainNode | null = null;
  private meter: AnalyserNode | null = null;
  enabled = true;

  /** 실제로 신호가 나가는지 측정 (검증용) — 0이면 소리가 안 나는 것이다 */
  peak(): number {
    if (!this.meter) return -1;
    const buf = new Float32Array(this.meter.fftSize);
    this.meter.getFloatTimeDomainData(buf);
    let p = 0;
    for (const v of buf) p = Math.max(p, Math.abs(v));
    return p;
  }
  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

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
      // 리미터 — 임팩트·함성이 겹쳐도 클리핑(지직거림)이 나지 않게
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 6;
      limiter.ratio.value = 10;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.18;
      this.meter = this.ctx.createAnalyser();
      this.meter.fftSize = 2048;
      this.master.connect(limiter);
      limiter.connect(this.meter);
      this.meter.connect(this.ctx.destination);

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
      lp.frequency.value = 760; // 작은 스피커에서도 웅성거림이 들리는 대역
      this.crowd = this.ctx.createGain();
      this.crowd.gain.value = 0;
      src.connect(lp).connect(this.crowd).connect(this.master);
      src.start();

      // 드론 — 음정이 있는 지속음. 웅성거림만으로는 도입부가 허전하다.
      // 음원 파일을 넣으면 '파일 0개' 구조가 깨지므로 여기서도 합성한다.
      // A2(110) + E3(164.8) 완전5도. 42Hz 초저음은 노트북·폰 스피커가 재생하지 못하므로
      // 배음이 많은 톱니파를 써서 220·330Hz대에 실제로 들리는 성분을 남긴다.
      this.drn = this.ctx.createGain();
      this.drn.gain.value = 0;
      const dlp = this.ctx.createBiquadFilter();
      dlp.type = 'lowpass';
      dlp.frequency.value = 520;
      dlp.Q.value = 0.7;
      dlp.connect(this.drn).connect(this.master);
      for (const [type, hz, lvl] of [
        ['sawtooth', 110, 0.5],
        ['sawtooth', 164.81, 0.34],
        ['triangle', 220, 0.22],
      ] as const) {
        const o = this.ctx.createOscillator();
        o.type = type;
        o.frequency.value = hz;
        o.detune.value = (Math.random() - 0.5) * 8; // 미세 디튠 — 기계적으로 안 들리게
        const g = this.ctx.createGain();
        g.gain.value = lvl;
        o.connect(g).connect(dlp);
        o.start();
      }
      // 아주 느린 필터 흔들림 — 정지된 소리가 아니라 숨쉬는 소리로
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.05;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 130;
      lfo.connect(lfoGain).connect(dlp.frequency);
      lfo.start();

      // 웅성거림이 살아있게 느껴지도록 완만한 랜덤 스웰 (앱 수명 동안 유지)
      window.setInterval(() => {
        if (!this.ctx || !this.crowd) return;
        const base = this.crowd.gain.value;
        if (base < 0.02) return; // 컷 상태면 건드리지 않는다
        const target = 0.15 + Math.random() * 0.08;
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

  ambient() { this.ramp(0.18, 1.2); }

  /** 드론 페이드. 0이면 끈다. 페이드가 길어야 '켜졌다'가 아니라 '있었다'로 들린다 */
  drone(v: number, sec = 3.5) {
    if (!this.ctx || !this.drn) return;
    this.drn.gain.cancelScheduledValues(this.ctx.currentTime);
    this.drn.gain.setValueAtTime(this.drn.gain.value, this.ctx.currentTime);
    this.drn.gain.linearRampToValueAtTime(v, this.ctx.currentTime + sec);
  }
  /** 결정의 순간 — 관중 소음 컷 */
  cut() { this.ramp(0.0, 0.35); }
  resumeAmbient() { this.ramp(0.18, 0.9); }

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
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 1.7);
    this.ramp(0.3, 0.3);
    setTimeout(() => this.ramp(0.18, 2), 2200);
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
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 1.3);
    this.ramp(0.04, 0.25);
    setTimeout(() => this.ramp(0.18, 3), 2500);
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
      g.gain.exponentialRampToValueAtTime(0.2, at + 0.02);
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

  /** 브리핑 임팩트 — 중계 그래픽이 박히는 히트.
   *  노트북·폰 스피커는 100Hz 아래를 못 낸다. 저음만 쓰면 "안 들리는 소리"가 되므로
   *  서브(체감) · 바디(중역, 실제로 들리는 대역) · 어택(고역) 세 층으로 쌓는다. */
  impact() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;

    const tone = (type: OscillatorType, f0: number, f1: number, peak: number, dur: number) => {
      const o = this.ctx!.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + dur + 0.05);
    };

    tone('sine', 150, 48, 0.45, 0.5);      // 서브 — 큰 스피커에서의 체감
    tone('triangle', 340, 120, 0.34, 0.3); // 바디 — 작은 스피커에서 실제로 들리는 층
    tone('square', 900, 420, 0.1, 0.09);   // 어택 — 타격의 시작점

    // 어택 노이즈
    const len = Math.floor(this.ctx.sampleRate * 0.09);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const ns = this.ctx.createBufferSource();
    ns.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1400;
    const ng = this.ctx.createGain();
    ng.gain.value = 0.22;
    ns.connect(hp).connect(ng).connect(this.master);
    ns.start(t);
  }

  /** 슬레이트 전환 — 짧은 클릭 */
  tick() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(1600, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.05);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.08);
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

// 어디를 처음 누르든 오디오가 열리게 — 화면마다 unlock을 심는 것보다 확실하다
if (typeof window !== 'undefined') {
  const open = () => audio.unlock();
  window.addEventListener('pointerdown', open, { once: true });
  window.addEventListener('keydown', open, { once: true });
  // 검증용 훅 (스크립트로 실제 출력 레벨을 잴 수 있게)
  (window as unknown as { __gsuAudio: AudioEngine }).__gsuAudio = audio;
}
