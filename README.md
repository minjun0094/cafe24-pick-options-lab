# Cafe24 골라담기 옵션

Cafe24 상품 상세 페이지의 기본 옵션을 수량별 골라담기 UI로 바꾸는 사전 과제입니다.
카페24의 원래 옵션 선택 이벤트를 그대로 사용하므로 재고, 품절, 추가금액과 상품 목록
추가 로직을 별도로 복제하지 않습니다.

## 파일 구성

- `src/pick-options-config.js`: 대상 상품, 셀렉터, 옵션값, UI 문구
- `src/pick-options.js`: 옵션 탐색, UI 생성, 카페24 선택 동작 연결
- `src/pick-options.css`: 반응형 및 접근성 스타일
- `cafe24/detail-snippet.html`: Cafe24 상세 템플릿 삽입 코드
- `docs/DECISIONS.md`: 주요 설계 판단
- `docs/QA.md`: 수동 검증 시나리오

## 설치

1. `src`의 세 파일을 Cafe24 파일 업로더의 `egnis` 폴더에 업로드합니다.
2. 업로더가 반환한 CDN 주소를 `cafe24/detail-snippet.html`에 넣고, 그 내용을 상품 상세 `detail.html` 상단에 추가합니다.
3. `pick-options-config.js`가 반드시 `pick-options.js`보다 먼저 로드되게 유지합니다.
4. 테스트 상품 `product_no=11`에서 동작을 확인합니다.

테스트 URL:
`https://minjun077.cafe24.com/product/detail.html?product_no=11`

## 브라우저 API

초기화 후 `window.PickOptions`가 제공됩니다.

```js
window.PickOptions.getOptions();
window.PickOptions.getSelected();
window.PickOptions.select('P000000L000A');
```

초기화와 선택 변경은 각각 `pick-options:ready`,
`pick-options:selection-change` 이벤트로도 확인할 수 있습니다.

## 안전한 실패

설정 파일 누락, 대상 상품 불일치, Cafe24 DOM 변경 등으로 초기화할 수 없으면 기존 옵션
UI를 숨기지 않습니다. 따라서 커스텀 UI가 실패해도 고객은 Cafe24 기본 UI로 주문할 수 있습니다.
