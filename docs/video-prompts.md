# 영상·이미지 생성 가이드 (Higgsfield 웹에서 직접 생성)

7일 무제한 기간에는 **웹에서 Unlimited mode를 켜면 무료**다. 크레딧이 나가는 작업(MCP 생성 등)은 **하지 않는다.**

## 쓸 모델 (확정)

| 용도 | 모델 | 이유 |
|---|---|---|
| **영상** | **Seedance 2.0** | 장르 지정(drama)과 High 비트레이트가 있어 분위기·화질 손잡이가 더 많다. 길이·4K·start_image는 Kling 3.0과 동일 |
| **이미지** | **Seedream 5.0 Pro** | Seedance와 같은 ByteDance 계열이라 스틸→영상 룩이 일치한다. 실사·필름 그레인 쪽으로 기울어 우리 프롬프트(`no CGI smoothness`)와 맞는다 |

Nano Banana Pro는 쓰지 않는다. 최대 강점이 **글자·다이어그램 렌더링**인데 우리는 생성물에 글자를 넣지 않으므로(한글 타이틀은 CSS로 얹는다) 그 강점이 무의미하고, 깔끔·그래픽한 쪽으로 기우는 성향이 오히려 CG 티라는 리스크가 된다.

**무제한 확인 방법**: 파란 `UNLIMITED` 뱃지만 믿지 말고, **생성 전후로 크레딧 잔액을 대조**한다(`balance`). 2026-07-27 기준 Seedream 5.0 Pro는 뱃지가 없었지만 Unlimited 토글을 켜면 실제로 0크레딧이었다.

> ### ⚠ 개수는 반드시 `1/4`로 둔다
>
> **Unlimited는 1회 1장까지만 적용된다.** 개수를 2 이상으로 올리면 그 생성은 무제한에서 빠져 **장당 3크레딧**이 청구된다. 첫 장만 공짜인 것도 아니고 **전부** 청구된다.
>
> 2026-07-27 실측 — 1장짜리 생성 7건은 모두 0크레딧, 2장짜리 생성 1건에서 같은 초에 `-3`, `-3` 두 건이 찍혔다(총 6크레딧).
>
> - 여러 장을 비교하고 싶으면 **1장씩 여러 번** 돌린다. 그건 여전히 공짜다.
> - 비율·해상도를 바꾼 뒤에는 **Unlimited 토글이 풀렸는지 생성 직전에 다시 본다.**
> - 생성할 때마다 잔액(`balance`)을 대조한다. 조회는 크레딧이 들지 않는다.

## 제작 순서

**STEP 1 — 이미지로 "경기장 룩" 먼저 확정** (빠르고 무제한이라 여러 장 뽑기 좋다)
- [x] `A. 세로 경기장 스틸` (9:16) → `docs/assets-src/bench-vertical.png`
- [x] `B. 가로 경기장 스틸` (16:9) → `docs/assets-src/bench-horizontal.png` (썸네일 배경 C까지 겸함)

**STEP 2 — 위 이미지를 첫 프레임으로 넣고 영상 생성**
- [ ] `1. 브리핑 배경` (9:16) ← A를 start image로
- [ ] `2. 시연영상 오프닝` (16:9) ← B를 start image로
- [ ] `3. 대기실 배경` (9:16, 선택) ← A를 start image로

**STEP 3 — 유튜브 썸네일용 이미지**
- [ ] `C. 썸네일 배경` (16:9) — 글자는 넣지 말고 배경만. 한글 타이틀은 내가 CSS로 얹어서 렌더한다(생성 모델은 한글을 제대로 못 쓴다)

**STEP 4 — 나한테 넘기기**
- [ ] 파일 경로만 알려주면 검수·압축·루프 처리·화면 적용은 내가 한다

## 영상 공통 설정

| 항목 | 값 |
|---|---|
| 모델 | **Seedance 2.0** |
| Unlimited mode | **켜기** (버튼이 "Generate Unlimited"로 바뀐다) |
| 길이 | **8초** (길수록 배경 루프 소재가 넉넉하다) |
| 해상도 | 720p |
| Bitrate | High |
| 오디오 | **끄기** (프롬프트 옆 🔊 아이콘을 Off로. 게임은 자체 합성 사운드를 쓴다) |
| genre | `drama` |

## 이미지 프롬프트

세 장 모두 아래 한 덩어리를 쓰고 **마지막 줄만** 바꾼다.

```
8K photorealistic photograph, physical cinema lens, shallow depth of field, fine film grain.
Not a 3D render, not a game engine, no CGI smoothness, not painterly, no illustration.
A large modern football stadium at night, completely empty. No people anywhere.
Deep blue-black night sky, cool blue shadows, warm amber floodlight pools on wet grass.
Faint atmospheric haze in the light beams. Empty dark seating bowl fading into blackness.
No text, no logos, no brand marks, no banners, no scoreboard numbers.
```

여기에 이어서 —

**A. 세로 경기장 스틸 (9:16)**
```
Framed from behind the deserted coaching bench. The empty bench seats fill the lower
foreground, the floodlit pitch stretches away beyond them. Vertical composition.
The centre of the frame is darker than the edges.
```
> 화면 가운데에 흰 글자가 얹히므로 **중앙이 어두운 컷**을 고를 것.

**B. 가로 경기장 스틸 (16:9)**
```
Low wide view of the empty pitch from the halfway line, floodlights burning above,
the stadium bowl symmetrical around the centre circle. Horizontal composition.
```

**C. 썸네일 배경 (16:9)**
```
The empty coaching bench seen from the side, floodlights flaring behind it,
strong contrast, the left third of the frame kept dark and simple for a title overlay.
```
> 왼쪽 1/3을 비워두는 이유: 거기에 「경우의 수」 타이틀을 얹는다.

## 영상 프롬프트 쓰는 법

앞의 **STYLE LOCK / CONTINUITY / DIRECTION 세 블록은 글자 그대로 똑같이** 붙이고, **SHOT 한 줄만** 바꾼다. 이게 여러 영상의 룩을 하나로 묶는 방법이다. 통째로 복사해서 붙여넣으면 된다.

## 프롬프트 구조 안내

앞의 **STYLE LOCK / CONTINUITY / DIRECTION 세 블록은 글자 그대로 똑같이** 붙이고, **SHOT 한 줄만** 바꾼다. 이게 여러 영상의 룩을 하나로 묶는 방법이다. 통째로 복사해서 붙여넣으면 된다.

---

## 1. 브리핑 배경 (세로 9:16) — 현재 배경 교체용

```
STYLE LOCK
8K photorealistic live-action cinematography, shot on physical cinema lenses.
Not a 3D render, not a game engine, no CGI smoothness, not painterly, no illustration.
Fine film grain, 180-degree shutter motion blur, 24fps.

CONTINUITY
A large modern football stadium at night, completely empty. No people anywhere.
Deep blue-black night sky, cool blue shadows, warm amber floodlight pools on wet grass.
Faint atmospheric haze in the light beams. Empty dark seating bowl fading into blackness.
Same stadium, same lighting, same palette in every shot.
No text, no logos, no brand marks, no banners, no scoreboard numbers.

DIRECTION
Slow deliberate camera movement only. No whip pans, no shaky cam, no fast cuts.
Single continuous take. Physically grounded camera with real weight. Shallow depth of field.
No music. Only ambient SFX. No subtitles.

SHOT
Slow push-in from behind the deserted coaching bench toward the floodlit pitch.
The empty bench seats stay in frame in the foreground throughout the shot.
The wet pitch stretches away, glowing under the floodlights.
```

**쓰이는 곳**: 게임 첫 화면(브리핑) 전체 배경. 세로 화면을 꽉 채우므로 **위아래로 잘려도 되는 구도**가 좋다. 화면 가운데에 흰 글자가 얹히니 **중앙이 너무 밝지 않은 컷**을 고를 것.

**현재 버전에서 고치고 싶은 점** (프레임을 뽑아 검수한 결과): 카메라가 벤치를 지나쳐버려 후반부가 그냥 젖은 바닥이 된다. 위 SHOT에 "벤치가 계속 화면에 남는다"를 넣은 이유다.

---

## 2. 시연영상 오프닝 훅 (가로 16:9) — 제출 필수 영상의 앞 8초

```
STYLE LOCK
8K photorealistic live-action cinematography, shot on physical cinema lenses.
Not a 3D render, not a game engine, no CGI smoothness, not painterly, no illustration.
Fine film grain, 180-degree shutter motion blur, 24fps.

CONTINUITY
A large modern football stadium at night, completely empty. No people anywhere.
Deep blue-black night sky, cool blue shadows, warm amber floodlight pools on wet grass.
Faint atmospheric haze in the light beams. Empty dark seating bowl fading into blackness.
Same stadium, same lighting, same palette in every shot.
No text, no logos, no brand marks, no banners, no scoreboard numbers.

DIRECTION
Slow deliberate camera movement only. No whip pans, no shaky cam, no fast cuts.
Single continuous take. Physically grounded camera with real weight. Shallow depth of field.
No music. Only ambient SFX. No subtitles.

SHOT
Low wide shot of the empty pitch from the halfway line, floodlights burning above.
Almost imperceptible slow drift forward. The stadium sits in complete silence.
```

**쓰이는 곳**: 유튜브 시연영상 맨 앞. 이 위에 「경우의 수」 타이틀을 후반작업으로 얹는다(영상 안에 글자를 넣지 않는 이유: 생성 모델은 한글을 제대로 못 쓴다).

---

## 3. (선택) 대기실 배경 (세로 9:16) — 경우의 수 대기실 장면용

```
STYLE LOCK
8K photorealistic live-action cinematography, shot on physical cinema lenses.
Not a 3D render, not a game engine, no CGI smoothness, not painterly, no illustration.
Fine film grain, 180-degree shutter motion blur, 24fps.

CONTINUITY
A large modern football stadium at night, completely empty. No people anywhere.
Deep blue-black night sky, cool blue shadows, warm amber floodlight pools on wet grass.
Faint atmospheric haze in the light beams. Empty dark seating bowl fading into blackness.
Same stadium, same lighting, same palette in every shot.
No text, no logos, no brand marks, no banners, no scoreboard numbers.

DIRECTION
Slow deliberate camera movement only. No whip pans, no shaky cam, no fast cuts.
Single continuous take. Physically grounded camera with real weight. Shallow depth of field.
No music. Only ambient SFX. No subtitles.

SHOT
Slow tilt down from the dark empty upper stands to the deserted pitch far below.
Half the floodlights are already switched off. The stadium after everyone has gone home.
```

**쓰이는 곳**: 경기가 끝나고 남의 경기 결과를 기다리는 화면. 있으면 그 장면의 무게가 커진다. 없어도 게임은 그대로 동작한다.

---

## 뽑은 다음

1. 마음에 드는 컷을 **mp4로 다운로드**한다. 무제한이니 **같은 프롬프트로 여러 번 돌려 제일 좋은 것**을 고른다.
2. 파일을 프로젝트 어딘가에 두고 **경로만 알려주면** 나머지는 내가 한다:
   - 프레임을 뽑아 **검수** (사람·로고 섞임, 구도, 루프 이음새)
   - 웹용 **압축** (원본 6MB대는 못 쓴다 → 300KB대로)
   - **핑퐁 루프** 처리 (반복될 때 툭 끊기지 않게)
   - 화면에 적용
3. 실패작도 지우지 말고 남겨 둔다. 다른 자리에 쓰거나, 창작과정 증빙으로 쓴다.

## 금지 사항 (실격 방지)

- 실존 선수·감독의 얼굴이 나오는 영상 금지 (초상권).
- FIFA·구단 로고, 실제 대회 마크, 유니폼 디자인이 보이는 컷 금지 (저작권).
- 영상 안에 글자를 넣지 말 것. 타이틀·자막은 후반작업으로.
- 음악은 생성하지 말 것. BGM이 필요하면 CC0 음원만 쓴다.
