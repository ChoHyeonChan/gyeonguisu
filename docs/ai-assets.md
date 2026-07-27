# AI 생성 자산 기록

공모전 AI 창작과정 증빙용. 생성에 쓴 모델·프롬프트·설정·후처리를 그대로 남긴다.

## public/intro.mp4 — 브리핑 배경 시네마틱

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

## 그 외

- 피치·선수 칩·아이콘·파비콘 등 나머지 시각 요소는 전부 **CSS/SVG로 직접 작성**했으며 외부 이미지 파일을 쓰지 않는다.
- 사운드는 외부 오디오 파일 없이 **Web Audio API로 합성**한다 (`src/game/audio.ts`).
