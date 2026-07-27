# 영상 생성 프롬프트 (Higgsfield 웹에서 직접 생성용)

7일 무제한 기간에는 **웹에서 Unlimited mode를 켜면 모델 제한 없이 무료**다. 그중 우리에게 가장 좋은 건 **Seedance 2.0** (8초까지, start_image 참조, 장르 힌트, High 비트레이트).

## 공통 설정

| 항목 | 값 |
|---|---|
| 모델 | **Seedance 2.0** |
| Unlimited mode | **켜기** (버튼이 "Generate Unlimited"로 바뀐다) |
| 길이 | **8초** (길수록 배경 루프 소재가 넉넉하다) |
| 해상도 | 720p |
| Bitrate | High |
| 오디오 | **끄기** (프롬프트 옆 🔊 아이콘을 Off로. 게임은 자체 합성 사운드를 쓴다) |
| genre | `drama` 또는 `noir` |

비율은 용도마다 다르다. 각 프롬프트 위에 적어 뒀다.

## 두 가지 방법

**A. 텍스트만으로 (간단)** — 아래 프롬프트를 그대로 붙여넣고 여러 번 돌려 고른다.

**B. 이미지 먼저 (정확) — 추천**
이미지 모델도 무제한이므로, 원하는 그림을 **이미지로 먼저 확정**하고 그걸 영상의 첫 프레임으로 쓴다.
1. 이미지 생성(Seedream 4.5 / Nano Banana 등)에 아래 **SHOT 블록의 장면 묘사**를 넣어 여러 장 뽑는다.
2. 제일 좋은 한 장을 고른다.
3. Seedance 2.0의 **Upload media → Image** 로 그 이미지를 넣고(start image), 아래 프롬프트를 함께 넣어 생성한다.
→ 구도가 운에 좌우되지 않고, 여러 영상의 룩이 같아진다.

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
