# Cafe24 골라담기 UI — 새로운 설계도 및 수정본

> 이 저장소는 기존 제출 내용에서 개선 부분을 수정한 새 Cafe24 계정과 상품에 맞춰 다시 정리한 **새로운 설계도 및 수정본**입니다.

## 적용 대상

- PC: <https://minjun0094.cafe24.com/product/detail.html?product_no=12>
- Mobile: <https://minjun0094.cafe24.com/m/product/detail.html?product_no=12>

## 새로운 설계도

```text
사용자
  ↓ 개입수와 맛 선택
pick-options.js
  ├─ pick-options-config.js에서 상품·문구·맛·가격 설정 로드
  ├─ 선택 수량 검증
  └─ Cafe24 원본 옵션 DOM click()
       ↓
Cafe24 기본 로직
  ├─ 선택상품 행 생성
  ├─ 수량 및 총금액 계산
  └─ 장바구니 / 바로구매 처리
```

PC와 모바일은 같은 데이터 구조와 동기화 방식을 사용하며, Cafe24 DOM 차이에 필요한 셀렉터와 CSS만 각각 유지합니다.

## 수정본의 주요 변경 사항

- 적용 상품을 `product_no=12`로 변경했습니다.
- 이전 계정에 고정된 이미지 주소를 `/web/upload/egnis/flavors/...` 상대 경로로 변경했습니다.
- PC와 모바일 설정을 동일하게 맞췄습니다.
- SFTP 연결 JSON을 `.vscode/sftp.json`에 추가했습니다.
- 비밀번호는 저장소에 기록하지 않으며, 연결 시 직접 입력합니다.

## 파일 구조

```text
cafe24/
├── skin1/                 # PC 스킨 업로드 원본
│   ├── product/detail.html
│   ├── js/pick-options-config.js
│   ├── js/pick-options.js
│   └── css/pick-options.css
└── mobile/                # 모바일 스킨 업로드 원본
    ├── product/detail.html
    ├── js/pick-options-config.js
    ├── js/pick-options.js
    └── css/pick-options.css
web/egnis/flavors/         # Cafe24 /web/upload/egnis/flavors/ 업로드 이미지
.vscode/sftp.json          # 로컬 SFTP 연결 설정(Git 제외)
```

## Cafe24 수정 및 업로드 순서

1. VS Code에서 SFTP 확장을 설치하고 이 프로젝트를 엽니다.
2. `.vscode/sftp.json` 설정으로 연결합니다. 비밀번호 요청 창에는 Cafe24에서 발급받은 SFTP 비밀번호를 입력합니다.
3. 로컬 폴더와 Cafe24 경로를 다음처럼 대응시킵니다.

| 로컬 | Cafe24 원격 경로 |
| --- | --- |
| `cafe24/skin1/product/detail.html` | `/skin1/product/detail.html` |
| `cafe24/skin1/js/*` | `/skin1/js/` |
| `cafe24/skin1/css/*` | `/skin1/css/` |
| `cafe24/mobile/product/detail.html` | `/mobile/product/detail.html` |
| `cafe24/mobile/js/*` | `/mobile/js/` |
| `cafe24/mobile/css/*` | `/mobile/css/` |
| `web/egnis/flavors/*` | `/web/upload/egnis/flavors/` |

4. 먼저 원격 파일을 백업한 뒤 수정 파일을 업로드합니다.
5. PC와 모바일 상품 12에서 옵션 선택, 가격 계산, 삭제·재선택, 장바구니와 바로구매를 확인합니다.

`uploadOnSave`는 실수로 운영 파일을 덮어쓰지 않도록 `false`로 설정했습니다. 접속 정보는 `2026-07-22` 이후 만료되므로 만료 후 Cafe24에서 다시 발급받아야 합니다.

## 운영 시 수정 위치

- 문구·맛·가격·품절 상태: 각 `js/pick-options-config.js`의 `ui`, `flavors`, `bundles`
- 상품 번호: `target.productNos`
- Cafe24 옵션 품목 코드: `bundles[].options`
- 화면 동작: `js/pick-options.js`
- 화면 스타일: `css/pick-options.css`

가격과 옵션 품목 코드는 Cafe24 관리자에 등록된 값과 반드시 동일하게 유지합니다.
