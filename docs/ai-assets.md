# AI 생성 자산 기록

공모전 AI 창작과정 증빙용. 생성에 쓴 모델·프롬프트·설정·후처리를 그대로 남긴다.

## public/intro.mp4 — 브리핑 배경 시네마틱 (최종본)

| 항목 | 값 |
|---|---|
| 생성일 | 2026-07-27 |
| 도구 | Higgsfield 웹 |
| 모델 | **Seedance 2.0** |
| 설정 | start image = `bench-vertical.png` · 9:16 · 8초 · 720p · Bitrate High · 오디오 없음 · 프리셋 GENERAL |
| 비용 | **0 크레딧** (7일 무제한. 거래 내역에서 0으로 확인) |
| 원본 | 720×1280 · 24fps · 8.04초 · 21.7MB (`docs/assets-src/intro-src-9x16.mp4`, git 제외) |

**프롬프트**: `docs/video-prompts.md`의 4블록(STYLE LOCK / CONTINUITY / DIRECTION / SHOT) 그대로. 앞 세 블록은 모든 영상에 글자 그대로 동일하게 넣어 룩을 묶는다.

**start image를 쓴 이유**: 텍스트만으로 뽑으면 구도가 매번 달라진다. 먼저 정지 이미지로 원하는 그림을 확정하고 그것을 첫 프레임으로 고정하면, 영상은 "그 그림을 어떻게 움직일지"만 결정하게 된다.

**후처리 (로컬 ffmpeg)**

```bash
# 1) 21.7MB 원본 → 480p 재인코딩
ffmpeg -i intro-src-9x16.mp4 -vf "scale=480:-2" -c:v libx264 -crf 33 -preset slow \
       -an -pix_fmt yuv420p t.mp4

# 2) 핑퐁 루프 — 정방향 + 역방향을 이어 붙여 이음새를 없앤다.
#    (첫 프레임과 끝 프레임의 카메라 위치가 달라 그냥 반복하면 점프가 보인다)
ffmpeg -i t.mp4 -filter_complex \
  "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -c:v libx264 -crf 33 -preset slow -an -movflags +faststart \
  -pix_fmt yuv420p intro.mp4          # 16.1초 / 327KB

# 3) 포스터(비디오 미지원 환경 폴백) 24KB
ffmpeg -i intro.mp4 -frames:v 1 -q:v 6 intro-poster.jpg
```

이번 원본은 8초라 배속 조정(`setpts`)이 필요 없었다. 압축은 540폭/CRF31(494KB)과 480폭/CRF33(327KB)을 프레임으로 대조해 **차이가 보이지 않아 작은 쪽**을 택했다.

**검수 방법**: 8초를 1초 간격 8프레임 콘택트시트로 뽑아 확인 — 사람·문자·로고 없음, 조명 빛줄기가 끝까지 유지됨, 급격한 카메라 움직임 없음.

**적용 후 발견한 문제**: `.brief-bg`의 `filter: brightness(1.35)`는 **어두웠던 이전 소스에 맞춰 둔 값**이라 새 영상에서는 하이라이트가 날아갔다. 캔버스로 실측해 1.15로 낮췄다.

| brightness | 완전히 날아간 픽셀 | 평균 휘도 |
|---|---|---|
| 1.0 | 0% | 45.7 |
| **1.15 (채택)** | 0.25% | 52.8 |
| 1.35 (이전) | 1.3% | 62.5 |

## public/waitroom.jpg — 경우의 수 대기실 배경

`coachdesk-vertical.png`(무전기·물병·바인더가 놓인 감독석)을 540폭으로 줄여 쓴다. 36KB.

```bash
ffmpeg -i coachdesk-vertical.png -vf "scale=540:-2,eq=brightness=0.07:contrast=1.06:saturation=0.92" \
       -q:v 7 waitroom.jpg
```

원본이 어두워 그대로 깔면 오버레이 아래에서 아무것도 안 보인다. `eq`로 살짝 올린 뒤 CSS에서 중앙 띠만 눌러 글자 가독성을 지킨다(`.waitroom`의 background-image 첫 레이어).

**이 그림을 여기에 쓴 이유**: 대기실은 경기가 끝나고 남의 경기 결과를 기다리는 장면이다. 무전기와 노트가 놓인 채 아무도 없는 감독석이 그 시간을 그대로 보여준다. 영상이 아니라 정지 이미지를 쓴 것은 기다림에는 움직임이 없는 편이 맞고, 용량도 36KB로 끝나기 때문이다.

## docs/assets-src/opening-16x9.mp4 — 시연영상 오프닝

같은 모델·같은 4블록 프롬프트에 SHOT만 교체(느린 전진 드리프트, 벤치는 좌하단에 고정). start image = `bench-horizontal.png` · 16:9 · 8초 · 720p · **0크레딧**. 원본 14.5MB를 CRF 20으로 재인코딩해 3.8MB 편집용 클립으로 보관. 이 위에 「경우의 수」 타이틀을 후반작업으로 얹는다. 좌하단이 계속 어둡게 유지되는 것을 프레임 검수로 확인했다.

## (이전 버전) kling3_0_turbo 브리핑 배경 — 대체됨

아래는 위 Seedance 2.0 버전으로 교체되기 전의 기록이다. 남겨두는 이유는 창작 과정의 일부이기 때문이다.

| 항목 | 값 |
|---|---|
| 생성일 | 2026-07-27 |
| 도구 | Higgsfield (claude.ai MCP) |
| 모델 | `kling3_0_turbo` |
| 설정 | 9:16 · 5초 · 720p(720×1280) · count 1 · 오디오 없음 |
| 비용 | 7.5 크레딧 |
| job id | `8cabacc7-f35b-43c6-acec-066a772db1db` |

**프롬프트 (원문 그대로)**

```
Empty football stadium at night. Slow cinematic push-in from the deserted
coaching bench toward the floodlit pitch. Wet grass reflecting stadium
floodlights, empty seats fading into deep blue darkness, faint haze in the
light beams. Moody, desaturated cinematography with warm floodlight glow.
No people, no text, no logos, no brand marks.
```

프롬프트에 `No people, no text, no logos, no brand marks`를 명시한 이유: 실존 인물의 초상, 실제 구단·대회의 로고나 마크가 생성물에 섞이지 않게 하기 위함. 결과물에도 사람·문자·로고가 없음을 확인했다.

**후처리 (로컬 ffmpeg)**

```bash
# 1) 6.8MB 원본 → 540p 재인코딩 (189KB)
ffmpeg -i intro.mp4 -vf "scale=540:-2" -c:v libx264 -crf 31 -preset slow \
       -an -movflags +faststart -pix_fmt yuv420p intro-web.mp4

# 2) 핑퐁 루프 — 정방향 + 역방향을 이어 붙여 이음새를 없앤다.
#    (원본은 끝 프레임과 첫 프레임이 달라 반복될 때마다 점프가 보였다)
#    setpts로 1.35배 늘려 배경에 어울리는 속도로. 5.0초 → 13.6초 / 373KB
ffmpeg -i intro-web.mp4 -filter_complex \
  "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,setpts=1.35*PTS[v]" \
  -map "[v]" -c:v libx264 -crf 31 -preset slow -an -movflags +faststart \
  -pix_fmt yuv420p intro.mp4

# 3) 포스터(비디오 미지원 환경 폴백) 30KB
ffmpeg -i intro.mp4 -vf "scale=540:-2" -frames:v 1 -q:v 6 intro-poster.jpg
```

**검수 방법**: 영상은 프레임을 뽑아 이미지로 확인했다.

```bash
# 콘택트시트로 전체 흐름 보기
ffmpeg -i intro.mp4 -vf "fps=1.2,scale=420:-2,tile=3x2" -frames:v 1 contact.jpg
# 루프 이음새 확인 (첫 프레임과 되돌아온 프레임 비교)
ffmpeg -i intro.mp4 -vf "select='eq(n\,0)+eq(n\,240)',scale=380:-2,tile=2x1" \
       -frames:v 1 -vsync 0 loopcheck.jpg
```

확인한 것: 사람·문자·로고 없음, 벤치에서 피치로 들어가는 구도, 루프 이음새 없음.

**사용처**: P1 브리핑 화면 배경 (muted · autoplay · loop · playsInline).
영상 로드에 실패해도 CSS 그라디언트 배경이 남아 화면은 정상 동작한다.

## docs/assets-src/*.png — 경기장 스틸 (영상의 첫 프레임 소재)

| 항목 | 값 |
|---|---|
| 생성일 | 2026-07-27 |
| 도구 | Higgsfield 웹 |
| 모델 | **Seedream 5.0 Pro** |
| 설정 | 9:16 · 2K · Unlimited mode ON · **1장씩 여러 번** 생성 후 비교 |
| 비용 | **0 크레딧** (7일 무제한 기간. 거래 내역에서 해당 생성 건이 모두 0으로 기록된 것을 확인) |

**프롬프트 (원문 그대로)**

```
8K photorealistic photograph, physical cinema lens, shallow depth of field, fine film grain.
Not a 3D render, not a game engine, no CGI smoothness, not painterly, no illustration.
A large modern football stadium at night, completely empty. No people anywhere.
Deep blue-black night sky, cool blue shadows, warm amber floodlight pools on wet grass.
Faint atmospheric haze in the light beams. Empty dark seating bowl fading into blackness.
No text, no logos, no brand marks, no banners, no scoreboard numbers.
Framed from behind the deserted coaching bench. The empty bench seats fill the lower
foreground, the floodlit pitch stretches away beyond them. Vertical composition.
The centre of the frame is darker than the edges.
```

**4장 중 채택 기준**

| 파일 | 그림 | 용도 |
|---|---|---|
| `bench-vertical.png` | 지붕 없는 맨 벤치, 조명탑 4개 빛줄기 | **채택** — 브리핑 배경 영상의 start image |
| `coachdesk-vertical.png` | 책상 위 무전기·물병·바인더 | 정지컷·썸네일 후보 |
| (미채택) | 관중석 전경, 조명 하나만 플레어 | 대기실 배경 후보 |
| (미채택) | 지붕 달린 더그아웃 + 가방 | 미사용 |

맨 벤치 컷을 고른 이유는 **영상의 첫 프레임으로 쓰이기 때문**이다. 카메라가 밀고 들어갈 때 얇고 작은 소품(물병·무전기·가방)은 형태가 뭉개진다. 전경에 뭉개질 것이 없고 빛줄기가 살아 있는 컷이 push-in에 가장 안전하다.

### 가로 컷 — `bench-horizontal.png` (2720×1536)

같은 모델·같은 공통 프롬프트에 SHOT만 아래로 교체해 뽑았다. 비율 16:9 · 2K · 개수 1 · **0크레딧**.

```
Wide shot from behind the deserted coaching bench, which sits in the dark lower-left
foreground. The floodlit pitch opens away to the right. Four floodlight towers stand
above the stadium bowl with their light beams clearly visible through the haze.
Horizontal composition. The lower-left third stays dark and simple.
```

**두 번의 실패를 거쳐 나온 프롬프트다.** 기록을 남기는 이유는 실패 원인이 프롬프트에 있었기 때문이다.

1. 1차 SHOT은 "하프라인에서 본 경기장"이었다 → 전경에 벤치가 없어 세로 컷과 다른 장소로 보였고, 한 컷에는 **골대가 세 개** 생기는 기하 오류가 있었다.
2. 2차 SHOT은 "터치라인을 따라 **낮게**(low wide)"였다 → 카메라가 바닥에 붙어 **조명탑과 빛줄기가 화면에서 빠졌다.** 세로 컷의 인상을 만들던 요소가 사라져 밋밋해졌다.
3. 3차에서 카메라를 다시 띄우고 `Four floodlight towers ... light beams clearly visible`를 **명시**하자 해결됐다.

**용도**: 시연영상 오프닝(16:9)의 start image 겸 유튜브 썸네일 배경. 좌하단이 벤치 실루엣으로 어둡게 비어 있어 「경우의 수」 타이틀을 얹을 자리가 나온다. 검수 결과 사람·문자·로고·골대 없음.

**검수 결과** (원본 1536×2720에서 확대 확인)

- 사람 없음 · 문자 없음 · 스코어보드 숫자 없음 · 구단/대회 로고 없음 — 두 장 모두 확인
- `coachdesk-vertical.png`의 물병에 라벨 없음, 바인더 종이는 백지, 무전기에 브랜드 마크 없음
- 프롬프트의 "중앙을 어둡게"는 네 장 모두 반영되지 않았다(조명 받는 잔디가 화면에서 가장 밝다). 글자 가독성은 생성물에 의존하지 않고 **CSS 비네트 레이어로 처리**한다.

## docs/assets-src/bgm-unfinished-horizon — 시연영상 BGM

| 항목 | 값 |
|---|---|
| 생성일 | 2026-07-27 |
| 도구 | Suno (Pro 구독) |
| 모델 | v5.5 · 심플 모드 · **연주곡(Instrumental)** |
| 제목 | Unfinished Horizon |
| 원본 | WAV 48kHz 스테레오 · 2분 54초 · 32MB (git 제외) |
| 저장소본 | AAC 192k · 4MB (편집용) |

**프롬프트 (원문 그대로)**

```
Sparse cinematic underscore. Solo piano with long sustained strings underneath.
Slow, restrained, melancholic but not sad. No drums until the halfway point,
then a quiet heartbeat pulse. No vocals. No lyrics. Leaves space for narration.
Ends unresolved.
```

`Ends unresolved`를 넣은 이유는 이 게임의 결말이 해소되지 않기 때문이다. 이겨도 남의 경기를 기다려야 하고, 그 결과는 바꿀 수 없다. 곡이 시원하게 끝나면 주제와 어긋난다.

**측정값** (ffmpeg로 실측, 청취 검증은 별도)

| 항목 | 값 | 판정 |
|---|---|---|
| Integrated loudness | −14.7 LUFS | 유튜브 기준(−14)에 근접. 내레이션을 얹으면 −24 부근까지 낮춰야 한다 |
| Loudness range | 7.3 LU | 배경음으로 적당 |
| Peak level | −3.18 dB | 헤드룸 확보, 클리핑 없음 |
| Flat factor | 0.000 | 디지털 클리핑 없음 |

**구조** (파형·스펙트로그램으로 확인): 성긴 구간과 밀도 높은 구간이 번갈아 나오고, **88초 지점(전체의 약 절반)부터 고역 트랜지언트가 늘어난다** — 프롬프트의 "No drums until the halfway point"가 반영된 것으로 보인다. 마지막 10초가 가늘게 잦아들며 끝난다. 16kHz에 로우패스 컷이 있는데 이는 생성 모델의 내부 손실 압축 흔적이며 사용에 지장은 없다.

**한계**: 위 항목들은 파일에서 측정한 값이다. **보컬 유무·분위기 적합성은 사람이 들어야 확정된다.**

**사용 범위**: **시연영상에만 쓴다.** 게임 자체의 사운드는 오디오 파일 없이 Web Audio API로 합성하며(`src/game/audio.ts`), 여기에 음원 파일을 끼우면 저작권이 원천적으로 무결한 구조가 깨지고 로딩 용량도 늘어난다.

## 그 외

- 피치·선수 칩·아이콘·파비콘 등 나머지 시각 요소는 전부 **CSS/SVG로 직접 작성**했으며 외부 이미지 파일을 쓰지 않는다.
- 사운드는 외부 오디오 파일 없이 **Web Audio API로 합성**한다 (`src/game/audio.ts`).
