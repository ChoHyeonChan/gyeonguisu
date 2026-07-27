# 영상 생성 프롬프트 (Higgsfield 웹에서 직접 생성용)

7일 무제한에 포함된 **Kling 3.0 (720p / 5초)** 로 웹에서 뽑는다. 무제한이니 **같은 프롬프트를 여러 번 돌려 제일 좋은 컷을 고른다.**

## 공통 설정

| 항목 | 값 |
|---|---|
| 모델 | Kling 3.0 (무제한 대상) |
| 해상도 | 720p |
| 길이 | 5초 |
| 오디오 | **끄기** (게임이 자체 합성 사운드를 쓴다) |
| 자막 | 없음 |

비율은 용도마다 다르다. 각 프롬프트 위에 적어 뒀다.

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
The empty bench seats sit in the foreground, slightly out of focus.
The wet pitch stretches away, glowing under the floodlights.
```

**쓰이는 곳**: 게임 첫 화면(브리핑) 전체 배경. 세로 화면을 꽉 채우므로 **위아래로 잘려도 되는 구도**가 좋다. 화면 가운데에 흰 글자가 얹히니 **중앙이 너무 밝지 않은 컷**을 고를 것.

---

## 2. 시연영상 오프닝 훅 (가로 16:9) — 제출 필수 영상의 앞 5초

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

1. 마음에 드는 컷을 **mp4로 다운로드**한다.
2. 파일을 프로젝트 어딘가에 두고 **경로만 알려주면** 압축(6MB대 원본은 웹에 못 쓴다)과 화면 적용은 내가 한다.
3. 실패작도 지우지 말고 남겨 둔다. 다른 자리에 쓰거나, 창작과정 증빙으로 쓴다.

## 금지 사항 (실격 방지)

- 실존 선수·감독의 얼굴이 나오는 영상 금지 (초상권).
- FIFA·구단 로고, 실제 대회 마크, 유니폼 디자인이 보이는 컷 금지 (저작권).
- 영상 안에 글자를 넣지 말 것. 타이틀·자막은 후반작업으로.
- 음악은 생성하지 말 것. BGM이 필요하면 CC0 음원만 쓴다.
