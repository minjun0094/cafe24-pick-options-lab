# Cafe24 골라담기 옵션

Cafe24 상품 상세 페이지의 기본 옵션을 수량별 골라담기 UI로 바꾸는 사전 과제입니다.
카페24의 원래 옵션 선택 이벤트를 그대로 사용하므로 재고, 품절, 추가금액과 상품 목록
추가 로직을 별도로 복제하지 않습니다.

## 파일 구성

- `cafe24/skin1/js/pick-options-config.js`: 대상 상품, 카드 데이터, 옵션값과 추가 횟수
- `cafe24/skin1/js/pick-options.js`: 옵션 탐색, UI 생성, 카페24 선택 동작 연결
- `cafe24/skin1/css/pick-options.css`: 반응형 및 접근성 스타일
- `cafe24/detail-snippet.html`: Cafe24 상세 템플릿 삽입 코드
- `docs/DECISIONS.md`: 주요 설계 판단
- `docs/QA.md`: 수동 검증 시나리오

## 설치

1. JS 파일은 활성 스마트디자인의 `/js`, CSS 파일은 `/css`에 업로드합니다.
2. `cafe24/detail-snippet.html` 내용을 상품 상세 `detail.html` 상단에 추가합니다.
3. `pick-options-config.js`가 반드시 `pick-options.js`보다 먼저 로드되게 유지합니다.
4. 테스트 상품 `product_no=11`에서 동작을 확인합니다.

테스트 URL:
`https://minjun077.cafe24.com/product/detail.html?product_no=11`

## 구현 방식

### 1. 옵션 UI

Figma의 44px 옵션 헤더와 64px 옵션 행을 기준으로, 개입수별 카드를 실제 `button`으로
생성합니다. PC와 모바일 모두 같은 정보 구조를 사용하며 좁은 화면에서도 가격과 뱃지가
겹치지 않도록 반응형 CSS를 적용했습니다.

### 2. 외부 설정 JS

`pick-options-config.js`의 `bundles`에서 개입수, 노출 가격, 개당 가격, 금액 차이,
추천 뱃지와 Cafe24 옵션값을 관리합니다. `options` 배열의 순서가 `_1`, `_2` 추가 순서이며
배열 길이가 해당 개입수의 최대 추가 횟수입니다.

### 3. Cafe24 옵션 동기화

커스텀 카드를 클릭하면 아직 선택되지 않은 다음 suffix의 Cafe24 기본 텍스트 버튼을
`click()` 합니다. 선택 여부는 `#totalProducts`의 `item_code[]` 값으로 다시 계산합니다.
따라서 행 추가, 가격 계산, 수량 변경, 삭제, 장바구니와 바로 구매는 Cafe24 기본 로직이
처리하며 별도로 구매 로직을 복제하지 않습니다.

## 브라우저 API

초기화 후 `window.PickOptions`가 제공됩니다.

```js
window.PickOptions.getState();
window.PickOptions.add(30);
```

초기화와 선택 변경은 각각 `pick-options:ready`,
`pick-options:selection-change` 이벤트로도 확인할 수 있습니다.

## 안전한 실패

설정 파일 누락, 대상 상품 불일치, Cafe24 DOM 변경 등으로 초기화할 수 없으면 기존 옵션
UI를 숨기지 않습니다. 따라서 커스텀 UI가 실패해도 고객은 Cafe24 기본 UI로 주문할 수 있습니다.
