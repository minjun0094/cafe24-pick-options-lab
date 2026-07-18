# Cafe24 골라담기 옵션 UI — 새로운 설계도 및 수정본

> 기존 사전과제 구현의 유지보수성과 성능 문제를 개선해 새 Cafe24 계정에 다시 적용한 **새로운 설계도 및 수정본**입니다.

Cafe24 베이직 스킨 상품 상세페이지에 골라담기 형태의 옵션 UI를 제공합니다. 커스텀 UI는 화면과 사용자 입력만 담당하고, 품목 생성·가격 계산·수량·장바구니·바로구매는 Cafe24 기본 DOM과 내장 로직을 그대로 사용합니다.

## 적용 대상

- PC: <https://minjun0094.cafe24.com/product/detail.html?product_no=12>
- Mobile: <https://minjun0094.cafe24.com/m/product/detail.html?product_no=12>

## 새로운 설계도

```text
Cafe24 상품 상세페이지
  ↓ 원본 옵션 DOM 탐색
pick-options.js
  ├─ 개입수·suffix·품목 옵션값 자동 추출
  ├─ 실제 옵션 가격·개당 가격·할인율 계산
  ├─ pick-options-config.js의 맛·문구·배지 결합
  └─ 골라담기 UI 생성
       ↓ 사용자 선택 완료
Cafe24 원본 옵션 버튼 click()
  ↓
Cafe24 기본 구매 로직
  ├─ 선택상품 품목 행 생성
  ├─ 수량·가격·총금액 계산
  └─ 장바구니·바로구매 처리
       ↓
MutationObserver
  └─ 실제 선택상품 DOM을 기준으로 커스텀 UI 재동기화
```

Cafe24가 이미 관리하는 상품 구성과 가격은 원본 DOM에서 읽고, Cafe24가 알 수 없는 맛 표시 정보와 마케팅 배지만 외부 설정에서 관리합니다.

## 구현 방식

### ① 옵션 UI 구현 방식

초기화 시 Cafe24 원본 옵션에서 찾은 개입수 구성을 기준으로 옵션 카드를 동적으로 생성합니다.

- 개입수 카드, 실제 가격, 개당 가격, 할인율 표시
- 맛별 이미지·이름·영양정보·신제품·BEST·품절 상태 표시
- 맛별 수량 증가·감소 및 실시간 합계 검증
- 선택한 개입수와 맛 수량의 합계가 일치할 때만 `선택 완료` 활성화
- 선택 완료 후 Cafe24 선택상품 행에 개입수와 맛 구성 요약 표시
- 수량 직접 입력과 증가 버튼에서도 suffix 기반 최대 횟수 제한
- 이미지 로딩 실패 시 텍스트 플레이스홀더 표시

맛은 `10개입` 단위로 선택합니다. 예를 들어 30개입을 고르면 맛 수량 합계가 3이 되어야 선택을 완료할 수 있습니다.

기본 옵션 DOM은 삭제하지 않습니다. 필수 DOM 확인과 커스텀 UI 초기화가 모두 성공한 경우에만 기본 옵션을 화면에서 숨깁니다. 초기화에 실패하면 Cafe24 기본 옵션과 구매 흐름을 그대로 사용할 수 있습니다.

### ② 외부 설정 JS 구조

`cafe24/common/pick-options-config.js`는 화면 데이터와 Cafe24 연동 규칙을 관리합니다.

| 영역 | 역할 | 일반 수정 여부 |
| --- | --- | --- |
| `ui` | 제목, 버튼, 상태 및 안내 문구 | 가능 |
| `flavors` | 맛 이름, 이미지, 영양정보, 신제품·BEST·품절 상태 | 가능 |
| `bundleMeta` | 개입수별 추천·최대할인 등 마케팅 배지 | 가능 |
| `assets` | Cafe24 이미지 업로드 기본 경로와 캐시 버전 | 이미지 배포 시 |
| `target` | 적용 상품 번호 | 상품 변경 시 |
| `selectors` | Cafe24 원본 DOM 셀렉터 | 스킨 구조 변경 시 |
| `option` | 옵션 라벨 규칙과 비활성 상태 규칙 | 옵션 규칙 변경 시 |
| `events` | 외부 연동용 커스텀 이벤트 이름 | 연동 변경 시 |

가격, 개당 가격, 할인율, 품목 옵션값, suffix는 설정 파일에 고정하지 않습니다. Cafe24 관리자에서 등록한 실제 옵션을 기준으로 자동 구성합니다.

Cafe24에서 추론할 수 없는 마케팅 정보만 `bundleMeta`에 지정합니다.

```js
bundleMeta: {
  30: { badge: '가장 많이 사요', badgeTone: 'accent' },
  100: { badge: '최대할인', badgeTone: 'danger' },
}
```

설정은 `deepFreeze()`로 고정해 실행 중 의도하지 않은 변경을 방지하고, 준비·선택 변경·최대 횟수 도달 이벤트를 외부에서 구독할 수 있도록 커스텀 이벤트를 제공합니다.

### ③ Cafe24 옵션과 동기화한 방식

Cafe24 원본 옵션 라벨을 다음 규칙으로 분석합니다.

```text
10개입_1, 10개입_2
30개입_1 (+5,000원), 30개입_2 (+5,000원)
```

```js
/^(\d+)개입_(\d+)(?:\s*\([^)]*\))?$/
```

라벨에서 개입수와 suffix를 추출하고, Cafe24 상품 기본 가격과 옵션 추가·차감 금액을 조합해 실제 가격을 계산합니다. 같은 개입수는 하나의 카드로 묶고 suffix 순서대로 사용 가능한 다음 품목을 선택합니다.

```text
커스텀 선택 완료
→ 실제 #totalProducts에서 사용 중인 품목 확인
→ 사용 가능한 다음 suffix 선택
→ Cafe24 원본 텍스트 옵션 버튼 click()
→ Cafe24가 선택상품 행과 가격 생성
→ MutationObserver가 DOM 변경 감지
→ 카드·횟수·수량·선택상품 UI 재동기화
```

선택 횟수는 별도 카운터만 믿지 않고 `#totalProducts`의 실제 품목 코드와 수량을 기준으로 계산합니다. 따라서 `_1`을 삭제하고 `_2`만 남아도 `_1`을 다시 선택할 수 있습니다.

Cafe24가 선택상품 행을 비동기적으로 생성하는 경우를 위해 짧은 재확인 로직과 `MutationObserver`를 사용합니다. 품목 생성, 재고 검증, 가격 및 총금액 계산, 장바구니와 바로구매는 Cafe24 기본 로직이 담당합니다.

## 기존 프로젝트 대비 개선점

| 구분 | 기존 구현 | 수정본 |
| --- | --- | --- |
| 옵션 구성 | `bundles`에 개입수와 옵션값 고정 | Cafe24 원본 DOM에서 개입수·suffix·옵션값 자동 탐색 |
| 가격 관리 | 가격·개당 가격·할인 문구 수동 입력 | Cafe24 기본 가격과 옵션 추가 금액으로 자동 계산 |
| 구성 변경 대응 | 관리자 변경 후 개발자가 PC/Mobile 설정 수정 | Cafe24 옵션 변경 후 페이지 로딩 시 자동 반영 |
| 상태 판단 | 별도 카운터 중심 | `#totalProducts` 실제 품목 코드와 수량을 기준으로 재계산 |
| suffix 재사용 | 삭제·재선택 시 상태 불일치 가능 | 실제 DOM에서 빈 suffix를 찾아 재사용 |
| PC/Mobile | JS·설정·CSS를 각각 관리 | 공통 JS·설정·CSS 한 벌과 모바일 전용 CSS만 유지 |
| 배포 | 수정 파일을 각각 수동 업로드 | 공통 소스에서 PC/Mobile 배포본 자동 생성 후 SFTP 업로드 |
| 이미지 | 1463×1753 PNG 8장, 합계 약 22MB | 194×232 WebP 8장, 합계 약 64KB |
| 이미지 로딩 | 페이지에서 즉시 디코딩 | `loading="lazy"`, `decoding="async"`, 크기 속성 지정 |
| 장애 대응 | 설정이 맞지 않으면 UI 사용 불가 | 초기화 성공 후에만 기본 옵션을 숨기고 실패 시 Cafe24 UI 유지 |
| 확장 데이터 | 내부 설정에 혼재 | `ui`, `flavors`, `bundleMeta`, 연동 설정으로 역할 분리 |

## PC/Mobile 공통화 및 자동 배포

개발 원본은 `cafe24/common` 한 곳에서 관리합니다.

```text
cafe24/common
  ├─ pick-options-config.js
  ├─ pick-options.js
  └─ pick-options.css
       ↓ scripts/watch-cafe24-assets.js
.cafe24-dist/skin1
.cafe24-dist/mobile
```

모바일에만 필요한 레이아웃과 하단 고정 구매 바 대응은 `cafe24/mobile/css/pick-options-mobile.css`에 분리했습니다.

VS Code 작업:

- `Cafe24: watch and deploy`: 공통·PC·Mobile 소스 변경 감시 및 배포본 자동 생성
- `Cafe24: build once`: 배포본 한 번 생성

직접 실행할 수도 있습니다.

```bash
node scripts/watch-cafe24-assets.js
node scripts/watch-cafe24-assets.js --once
```

`.cafe24-dist`는 생성 결과이므로 Git에서 제외합니다. SFTP 설정은 민감한 접속 정보를 포함할 수 있어 `.vscode/sftp.json`을 Git에 포함하지 않습니다.

## 이미지 최적화

맛 이미지는 `cafe24/assets/flavors`의 WebP 파일을 사용합니다.

- 원본 비율을 유지해 높이 232px로 축소
- WebP 품질 78 적용
- 8장 합계 약 22MB에서 약 64KB로 감소
- `loading="lazy"`와 `decoding="async"` 적용
- `width`, `height` 지정으로 레이아웃 이동 감소
- 같은 파일명을 교체할 때 `assets.version`으로 CDN 캐시 갱신

재변환 명령:

```bash
python3 scripts/optimize-flavor-images.py <원본-PNG-폴더> cafe24/assets/flavors
```

## 파일 구조

```text
cafe24/
├── common/
│   ├── pick-options-config.js
│   ├── pick-options.js
│   └── pick-options.css
├── skin1/
│   └── product/
│       ├── detail.html
│       └── list.html
├── mobile/
│   ├── product/detail.html
│   └── css/pick-options-mobile.css
└── assets/
    └── flavors/*.webp
scripts/
├── watch-cafe24-assets.js
└── optimize-flavor-images.py
.vscode/tasks.json
.cafe24-dist/                  # 자동 생성, Git 제외
```

## 운영 시 수정 위치

| 변경 내용 | 수정 위치 |
| --- | --- |
| 맛 이름·이미지·영양정보·품절 | `config.flavors` |
| 추천·최대할인 배지 | `config.bundleMeta` |
| 화면 문구 | `config.ui` |
| 적용 상품 제한 | `config.target.productNos` |
| Cafe24 스킨 DOM 변경 | `config.selectors` |
| 옵션 이름 규칙 변경 | `config.option.labelPattern` |
| 공통 동작 | `cafe24/common/pick-options.js` |
| 공통 스타일 | `cafe24/common/pick-options.css` |
| 모바일 전용 스타일 | `cafe24/mobile/css/pick-options-mobile.css` |

상품 가격과 옵션 품목값은 코드에서 수정하지 않고 Cafe24 관리자에서 관리합니다.

## 제한사항

- 맛 선택 정보는 화면 표시용이며 Cafe24 주문 데이터에 별도로 저장하지 않습니다.
- 옵션 자동 탐색은 `개입수_suffix` 형식의 옵션 라벨을 전제로 합니다.
- suffix 최대 횟수 제한은 상품 상세페이지에서 옵션을 선택하는 과정에 적용합니다.
- 장바구니 페이지의 수량 변경은 Cafe24 기본 동작을 유지합니다.
- 무료배송 진행 UI는 과제 범위에서 제외해 비활성화했습니다.
- Cafe24 관리자 계정, 비밀번호, API Key 등 민감 정보는 저장소에 포함하지 않습니다.

## 주요 검증 항목

- Cafe24 옵션·가격 변경 후 카드 자동 반영
- 선택 완료 후 Cafe24 기본 품목 행 생성
- 반복 선택·삭제·재선택 및 빈 suffix 재사용
- 수량 버튼과 직접 입력의 최대 횟수 제한
- 선택상품 수량·가격·총금액·삭제 동작
- 장바구니와 바로구매 기본 흐름
- PC/Mobile 공통 코드 동작 및 모바일 레이아웃
- WebP 이미지, lazy loading 및 이미지 실패 대체 표시
