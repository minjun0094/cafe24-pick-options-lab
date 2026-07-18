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

맛 선택 단위는 고정값이 아니라 `pick-options-config.js`의 `flavorUnitQuantity`로 관리합니다.

```js
flavorUnitQuantity: 10,
```

선택해야 하는 맛 수량은 다음 식으로 계산합니다.

```text
필요한 맛 선택 수량 = 선택한 bundle 개입수 ÷ flavorUnitQuantity
```

현재 설정값이 `10`이므로 다음과 같이 동작합니다.

| 선택한 구성 | 계산 | 필요한 맛 수량 |
| ---: | ---: | ---: |
| 10개입 | 10 ÷ 10 | 1 |
| 30개입 | 30 ÷ 10 | 3 |
| 50개입 | 50 ÷ 10 | 5 |
| 100개입 | 100 ÷ 10 | 10 |

운영 상품이 5개 단위 맛 묶음으로 변경되면 설정만 다음처럼 바꿀 수 있습니다.

```js
flavorUnitQuantity: 5,
```

이 경우 30개입은 `30 ÷ 5 = 6`이므로 맛 수량 합계가 6일 때 선택 완료 버튼이 활성화됩니다.

`flavorUnitQuantity`는 실제 선택 수량 검증에 사용하는 전역 단위이고, 각 맛의 `packQuantity`는 맛 이름 옆에 표시하는 개입수입니다.

```js
{
  id: 'tteokbokki',
  name: '떡볶이맛',
  packQuantity: 10,
}
```

일반 운영에서는 모든 맛의 `packQuantity`를 `flavorUnitQuantity`와 동일하게 맞춥니다. `packQuantity`만 변경하면 화면 문구만 바뀌고 선택 완료 계산은 바뀌지 않습니다.

또한 Cafe24에서 자동으로 읽은 모든 bundle 개입수는 `flavorUnitQuantity`로 나누어떨어져야 합니다. 예를 들어 30개입 구성에 `flavorUnitQuantity: 8`을 사용하면 필요한 맛 수량이 `3.75`가 되어 정수 수량으로 맞출 수 없으므로 선택 완료가 불가능합니다.

기본 옵션 DOM은 삭제하지 않습니다. 필수 DOM 확인과 커스텀 UI 초기화가 모두 성공한 경우에만 기본 옵션을 화면에서 숨깁니다. 초기화에 실패하면 Cafe24 기본 옵션과 구매 흐름을 그대로 사용할 수 있습니다.

### ② 외부 설정 JS 구조

`cafe24/common/pick-options-config.js`는 화면 데이터와 Cafe24 연동 규칙을 관리합니다.

| 영역 | 역할 | 일반 수정 여부 |
| --- | --- | --- |
| `ui` | 제목, 버튼, 상태 및 안내 문구 | 가능 |
| `flavors` | 맛 이름, 이미지, 영양정보, 신제품·BEST·품절 상태 | 가능 |
| `bundleMeta` | 개입수별 추천·최대할인 등 마케팅 배지 | 가능 |
| `flavorUnitQuantity` | 맛 한 번 선택이 의미하는 상품 개수 | 상품 구성 변경 시 |
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

#### `pick-options-config.js` 수정 가이드

설정은 수정 난이도와 영향 범위에 따라 세 단계로 구분합니다.

| 단계 | 대상 | 수정 권한 |
| --- | --- | --- |
| 안전 | `ui`, `flavors`, `bundleMeta`, `assets.version` | 일반 운영 개발자 |
| 주의 | `flavorUnitQuantity`, `target`, `shippingProgress` | 상품 구성을 이해하는 개발자 |
| 연동 | `selectors`, `option`, `events`, `assets.flavorImageBaseUrl` | Cafe24 DOM과 연동 코드를 확인할 수 있는 개발자 |

설정 객체는 페이지 실행 중 `deepFreeze()`되므로 브라우저 콘솔이나 다른 JS에서 직접 값을 변경할 수 없습니다. 값을 수정할 때는 원본 파일을 고친 뒤 PC와 Mobile 배포본을 다시 생성해야 합니다.

##### `version`

```js
version: 3,
```

설정 구조의 버전을 구분하는 값입니다. 현재 UI 계산에는 직접 사용하지 않지만 설정 스키마가 변경될 때 버전을 올려 외부 연동 코드가 호환성을 판단할 수 있게 합니다. 일반 문구나 맛 정보만 변경할 때는 수정하지 않습니다.

##### `target`: 적용 상품 제한

```js
target: {
  productNos: [],
  productNoQueryKey: 'product_no',
},
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `productNos` | `string[]` | UI를 적용할 Cafe24 상품 번호 목록 |
| `productNoQueryKey` | `string` | URL에서 상품 번호를 읽을 쿼리 키 |

`productNos`가 빈 배열이면 옵션 이름 규칙과 필수 DOM이 맞는 모든 상품에 적용합니다.

```js
// 상품 12에만 적용
productNos: ['12'],

// 상품 12와 15에 적용
productNos: ['12', '15'],

// 호환되는 모든 상품에 적용
productNos: [],
```

URL에서 읽은 상품 번호는 문자열이므로 `12`가 아니라 `'12'`로 입력합니다.

##### `ui`: 화면 문구

| 필드 | 표시 위치 또는 역할 | 토큰 |
| --- | --- | --- |
| `heading` | 옵션 UI 제목 | 없음 |
| `description` | 제목 아래 안내 문구 | 없음 |
| `soldOutLabel` | 사용할 수 없는 개입수 카드 | 없음 |
| `limitLabel` | suffix 최대 횟수 도달 안내 | 없음 |
| `countTemplate` | 현재 선택 횟수 | `{selected}`, `{max}` |
| `currency` | 가격 뒤 통화 단위 | 없음 |
| `flavorHeading` | 맛 선택 영역 제목 | `{label}` |
| `flavorDescription` | 맛 선택 영역 설명 | 없음 |
| `flavorUnitLabel` | 선택상품 맛 요약의 단위 문구 | 없음 |
| `totalLabel` | 맛 선택 합계 제목 | 없음 |
| `selectedTotalTemplate` | 현재·목표 수량 | `{current}`, `{target}` |
| `completeLabel` | 선택 완료 버튼 | 없음 |
| `cancelLabel` | 닫기 버튼 접근성 문구 | 없음 |
| `decreaseLabel` | 감소 버튼 접근성 문구 | 없음 |
| `increaseLabel` | 증가 버튼 접근성 문구 | 없음 |
| `imageAltSuffix` | 이미지 대체 텍스트 뒤 문구 | 없음 |
| `newLabel` | 신제품 상태 문구 | 없음 |
| `bestLabel` | BEST 상태 문구 | 없음 |
| `selectOptionMessage` | 옵션 없이 구매할 때 토스트 | 없음 |
| `minimumQuantityMessage` | 수량을 1보다 작게 만들 때 토스트 | 없음 |
| `selectionGuideCurrentTemplate` | 현재 맛 선택 수량 안내 | `{current}` |
| `selectionGuideRemainingTemplate` | 남은 수량 강조 문구 | `{remaining}` |
| `selectionGuideSuffix` | 남은 수량 안내의 마지막 문구 | 없음 |

템플릿 토큰은 코드가 실제 값으로 치환하므로 문구를 수정할 때 삭제하지 않는 것을 권장합니다.

```js
countTemplate: '{selected}/{max}회 선택',
selectedTotalTemplate: '({current}/{target}개)',
selectionGuideRemainingTemplate: '{remaining}개 더 선택',
```

`addLabel`, `remainingTemplate`, `unitPrefix`, `selectionSummaryLabel`은 이전 UI 또는 확장 UI 호환을 위해 유지한 예약 문구입니다. 현재 화면에서 직접 사용하려면 `pick-options.js`의 렌더링 코드 연결도 함께 확인합니다.

##### `flavorUnitQuantity`: 맛 선택 계산 단위

```js
flavorUnitQuantity: 10,
```

한 번의 맛 수량 선택이 실제 상품 몇 개를 의미하는지 지정합니다.

```text
필요한 맛 수량 = bundle 개입수 ÷ flavorUnitQuantity
```

변경 전 다음 조건을 모두 확인합니다.

1. Cafe24의 모든 bundle 개입수가 이 값으로 나누어떨어져야 합니다.
2. 모든 `flavors[].packQuantity` 표시값도 같은 단위로 맞춥니다.
3. 기존에 저장된 맛 설명과 운영 문구가 새 단위와 일치해야 합니다.

##### `flavors`: 맛 카드 데이터

```js
{
  id: 'tteokbokki',
  name: '떡볶이맛',
  packQuantity: 10,
  calories: '130',
  protein: '18',
  isNew: true,
  isBest: false,
  soldOut: false,
  image: 'tteokbokki.webp',
}
```

| 필드 | 타입 | 설명 및 주의사항 |
| --- | --- | --- |
| `id` | `string` | 맛을 구분하는 고유값. 중복 금지, 운영 중 불필요한 변경 금지 |
| `name` | `string` | 화면과 선택상품 요약에 표시할 이름 |
| `packQuantity` | `number` | 맛 이름 옆 표시값. 실제 검증은 `flavorUnitQuantity`가 담당 |
| `calories` | `string` | kcal 숫자. `''`이면 칼로리 문구를 숨김 |
| `protein` | `string` | 단백질 g 숫자. `''`이면 단백질 문구를 숨김 |
| `isNew` | `boolean` | `true`이면 `ui.newLabel` 표시 |
| `isBest` | `boolean` | `true`이면 `ui.bestLabel` 표시 |
| `soldOut` | `boolean` | `true`이면 해당 맛 증가 버튼 비활성화 |
| `image` | `string` | WebP 파일명, 절대 URL 또는 루트 상대 경로 |

이미지 파일명만 입력하면 `assets.flavorImageBaseUrl` 뒤에 자동으로 결합합니다.

```js
image: 'tteokbokki.webp'
```

전체 URL이나 `/`로 시작하는 경로를 입력하면 기본 경로를 붙이지 않고 그대로 사용합니다.

```js
image: 'https://example.com/flavors/tteokbokki.webp'
image: '/images/tteokbokki.webp'
```

`soldOut`은 커스텀 맛 선택 UI만 비활성화합니다. Cafe24의 실제 품목 재고나 주문 가능 상태를 변경하지 않습니다.

맛 추가 순서:

1. WebP 이미지를 `cafe24/assets/flavors`에 추가합니다.
2. `flavors` 배열에 고유한 `id`와 표시 정보를 추가합니다.
3. SFTP 이미지 컨텍스트로 이미지를 업로드합니다.
4. PC와 Mobile에서 이미지·상태·수량 선택을 확인합니다.

##### `bundleMeta`: 개입수 카드 배지

```js
bundleMeta: {
  30: { badge: '가장 많이 사요', badgeTone: 'accent' },
  100: { badge: '최대할인', badgeTone: 'danger' },
},
```

키는 Cafe24 옵션 라벨에서 읽은 개입수와 일치해야 합니다. 해당 개입수가 Cafe24에 없으면 배지도 표시되지 않습니다.

| 필드 | 값 | 설명 |
| --- | --- | --- |
| `badge` | 문자열 | 카드에 표시할 마케팅 문구 |
| `badgeTone` | `'accent'` | 기본 강조 색상 |
| `badgeTone` | `'danger'` | 최대할인 등 강한 강조 색상 |

배지를 제거하려면 해당 개입수 행을 삭제합니다. 가격과 할인율은 `bundleMeta`에서 입력하지 않습니다.

##### `assets`: 이미지 경로와 캐시

```js
assets: {
  flavorImageBaseUrl: 'https://.../web/upload/egnis/flavors/',
  version: '20260718',
},
```

| 필드 | 설명 |
| --- | --- |
| `flavorImageBaseUrl` | 파일명 형태의 맛 이미지를 불러올 Cafe24 CDN 기본 경로 |
| `version` | 이미지 URL 뒤에 붙는 캐시 갱신 값 |

`flavorImageBaseUrl`은 마지막 `/`까지 입력합니다. Cafe24 계정이나 이미지 업로드 폴더가 바뀔 때만 수정합니다.

같은 이름의 이미지를 교체했는데 이전 이미지가 보이면 `version`을 변경합니다.

```js
version: '20260719',
```

결과 URL은 다음과 같습니다.

```text
{flavorImageBaseUrl}tteokbokki.webp?v=20260719
```

##### `shippingProgress`: 무료배송 진행 UI

```js
shippingProgress: {
  enabled: false,
  completeMessage: '무료배송 혜택을 받았어요',
  thresholdUnit: '만원',
},
```

현재 과제 범위에서는 `enabled: false`로 비활성화합니다. 활성화하면 Cafe24 배송비 DOM에서 무료배송 기준 금액을 읽어 총금액에 따른 진행 상태를 표시합니다. 스킨의 배송비 문구 형식이 다르면 정상적으로 계산되지 않을 수 있으므로 활성화 전 `selectors.deliveryPrice`와 실제 DOM을 확인합니다.

`thresholdUnit`은 확장 표시용 예약 설정입니다. 현재 진행 UI의 실제 금액 표시는 `ui.currency`를 사용합니다.

##### `selectors`: Cafe24 DOM 연결

| 필드 | 찾는 대상 |
| --- | --- |
| `optionTable` | 기본 옵션 영역 테이블 |
| `optionList` | Cafe24 텍스트 버튼 옵션 목록 |
| `optionItem` | 각 원본 옵션 버튼 항목 |
| `optionSelect` | Cafe24 원본 `<select>` 옵션 |
| `totalProducts` | 선택상품 전체 영역 |
| `totalPrice` | 총금액 영역 |
| `productPrice` | PC·Mobile 상품 기본 가격 |
| `deliveryPrice` | 배송비 및 무료배송 기준 문구 |
| `selectedProduct` | 선택상품 행 호환 셀렉터 |
| `selectedItemCode` | 선택상품 행의 실제 Cafe24 품목 코드 |
| `purchaseButton` | 장바구니·바로구매 버튼 |

이 영역은 스킨 HTML 구조가 바뀔 때만 수정합니다. 수정 전 PC와 Mobile 개발자도구에서 다음 조건을 확인합니다.

1. `optionTable`, `optionList`, `optionSelect`가 상품 옵션 영역에서 각각 하나만 선택되는지 확인합니다.
2. `selectedItemCode`가 각 선택상품 행의 실제 품목값을 가리키는지 확인합니다.
3. `purchaseButton`이 다른 링크나 버튼까지 선택하지 않는지 확인합니다.
4. PC와 Mobile에서 같은 셀렉터가 모두 동작하는지 확인합니다.

필수 DOM을 찾지 못하면 커스텀 UI는 초기화를 중단하고 Cafe24 기본 옵션을 유지합니다.

##### `option`: 옵션 이름과 상태 규칙

```js
option: {
  valueAttribute: 'option_value',
  emptyValues: ['', '*', '**'],
  selectedClass: 'ec-product-selected',
  unavailableClasses: ['ec-product-disabled', 'ec-product-soldout'],
  labelPattern: /^(\d+)개입_(\d+)(?:\s*\([^)]*\))?$/,
},
```

| 필드 | 설명 |
| --- | --- |
| `valueAttribute` | 원본 옵션 버튼에서 품목 옵션값을 읽을 속성 |
| `emptyValues` | 실제 상품 옵션으로 처리하지 않을 안내값 |
| `selectedClass` | Cafe24 선택 상태 호환용 클래스 |
| `unavailableClasses` | 품절·비활성 옵션으로 판단할 클래스 목록 |
| `labelPattern` | 옵션명에서 개입수와 suffix를 추출할 정규식 |

`labelPattern`의 첫 번째 캡처 그룹은 개입수, 두 번째 캡처 그룹은 suffix여야 합니다.

```text
30개입_2 (+5,000원)
  ├─ 첫 번째 그룹: 30
  └─ 두 번째 그룹: 2
```

옵션 이름 규칙을 바꾸면 정규식뿐 아니라 Cafe24 관리자에 등록된 모든 대상 옵션명이 같은 규칙을 따르는지 확인합니다.

##### `events`: 외부 연동 이벤트

| 필드 | 발생 시점 | `event.detail` |
| --- | --- | --- |
| `configReady` | 설정 등록 완료 | 전체 설정 객체 |
| `ready` | UI 초기화 완료 | `controller`, `element` |
| `selectionChange` | 선택 상태 재계산 완료 | bundle별 `states` |
| `limitReached` | 추가 가능한 suffix 없음 | `bundle`, `state` |

다른 스크립트에서 이벤트를 구독할 수 있습니다.

```js
window.addEventListener('pick-options:selection-change', function (event) {
  console.log(event.detail.states);
});
```

이벤트 이름을 변경하면 해당 이벤트를 구독하는 외부 코드도 함께 변경합니다.

##### 설정 변경 후 검증 순서

1. `node --check cafe24/common/pick-options-config.js`로 문법을 확인합니다.
2. `Cafe24: build once` 또는 감시 작업으로 PC·Mobile 배포본을 생성합니다.
3. PC와 Mobile에서 대상 상품을 강력 새로고침합니다.
4. 개입수 카드·가격·배지·이미지·품절 상태를 확인합니다.
5. 모든 개입수에서 맛 수량 합계와 선택 완료 활성화를 확인합니다.
6. 반복 선택·삭제·빈 suffix 재사용을 확인합니다.
7. 수량 직접 입력, 장바구니, 바로구매를 확인합니다.

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
| 맛 선택 단위 | `config.flavorUnitQuantity` 및 `flavors[].packQuantity` |
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
