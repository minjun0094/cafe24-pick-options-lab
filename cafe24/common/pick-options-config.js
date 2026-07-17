/**
 * Cafe24 골라담기 UI 설정
 *
 * 상품 구성, 가격, 품목 코드와 suffix는 Cafe24 원본 DOM에서 자동으로 읽는다.
 *
 * 일반 수정: ui, flavors, bundleMeta
 * 연동 수정: target, selectors, option, events
 */
(function registerPickOptionsConfig(window) {
  'use strict';

  const config = {
    version: 3,

    // Cafe24 연동 영역: 상품이나 스킨 DOM 구조가 바뀔 때만 수정한다.
    target: {
      productNos: [],
      productNoQueryKey: 'product_no',
    },
    selectors: {
      optionTable: 'table.xans-product-option',
      optionList: '.ec-product-button[product_type="product_option"]',
      optionItem: 'li[option_value]',
      optionSelect: 'select[name^="option"]',
      totalProducts: '#totalProducts',
      totalPrice: '#totalPrice',
      productPrice: '#span_product_price_text, #span_product_price_mobile_text',
      deliveryPrice: '.delv_price_B',
      selectedProduct: '#totalProducts tr.option_product',
      selectedItemCode: 'input.option_box_id[name="item_code[]"]',
      purchaseButton: '.xans-product-detail .infoArea .ec-base-button.gColumn a[onclick^="product_submit"], #actionCart, #actionCartClone, .xans-product-action .ec-base-button.gColumn a.btnStrong, #orderFixArea .ec-base-button.gColumn a.btnStrong',
    },
    option: {
      valueAttribute: 'option_value',
      emptyValues: ['', '*', '**'],
      selectedClass: 'ec-product-selected',
      unavailableClasses: ['ec-product-disabled', 'ec-product-soldout'],
      labelPattern: /^(\d+)개입_(\d+)(?:\s*\([^)]*\))?$/,
    },

    // 일반 수정 영역: 화면 문구를 관리한다.
    ui: {
      heading: '옵션 선택 (필수)',
      description: '원하는 개입수를 선택해 주세요.',
      addLabel: '담기',
      soldOutLabel: '품절',
      limitLabel: '최대 선택 완료',
      countTemplate: '{selected}/{max}회 선택',
      remainingTemplate: '최대 {max}회 추가 가능',
      currency: '원',
      unitPrefix: '개당 ',
      flavorHeading: '{label} 맛 선택',
      flavorDescription: '',
      flavorUnitLabel: '10개입',
      totalLabel: '총 수량',
      selectedTotalTemplate: '({current}/{target}개)',
      completeLabel: '선택 완료',
      cancelLabel: '취소',
      decreaseLabel: '수량 빼기',
      increaseLabel: '수량 더하기',
      imageAltSuffix: ' 상품 이미지',
      selectionSummaryLabel: '선택한 맛',
      newLabel: '신제품 출시!',
      bestLabel: 'BEST',
      selectOptionMessage: '옵션을 선택해 주세요',
      minimumQuantityMessage: '최소 주문수량은 1개입니다',
      selectionGuideCurrentTemplate: '현재 {current}개 선택됨 · 옵션을 ',
      selectionGuideRemainingTemplate: '{remaining}개 더 선택',
      selectionGuideSuffix: '해 주세요',
    },
    flavorUnitQuantity: 10,
    shippingProgress: {
      enabled: false,
      completeMessage: '무료배송 혜택을 받았어요',
      thresholdUnit: '만원',
    },
    assets: {
      flavorImageBaseUrl: 'https://ecimg.cafe24img.com/pg3154b03340923096/minjun0094/web/upload/egnis/flavors/',
      version: '20260718',
    },

    // 일반 수정 영역: 맛별 표시 정보와 선택 가능 상태를 관리한다.
    // image에는 cafe24/assets/flavors에 있는 파일명만 입력한다. 비어 있으면 플레이스홀더가 표시된다.
    // calories/protein은 숫자만 입력한다. 빈 값이면 화면에 표시하지 않는다.
    // isNew/isBest는 상태 라벨, soldOut: true이면 수량 선택 영역을 비활성화한다.
    flavors: [
      { id: 'tteokbokki', name: '떡볶이맛', packQuantity: 10, calories: '130', protein: '18', isNew: true, isBest: false, soldOut: false, image: 'tteokbokki.webp' },
      { id: 'butter-chicken', name: '버터치킨커리맛', packQuantity: 10, calories: '105', protein: '18', isNew: false, isBest: false, soldOut: true, image: 'butter-chicken.webp' },
      { id: 'hot-seasoned', name: '핫양념치킨맛', packQuantity: 10, calories: '125', protein: '18', isNew: false, isBest: false, soldOut: false, image: 'hot-seasoned.webp' },
      { id: 'chipotle-mayo', name: '치폴레마요맛', packQuantity: 10, calories: '125', protein: '18', isNew: false, isBest: false, soldOut: false, image: 'chipotle-mayo.webp' },
      { id: 'sweet-onion', name: '스위트어니언맛', packQuantity: 10, calories: '125', protein: '18', isNew: false, isBest: false, soldOut: false, image: 'sweet-onion.webp' },
      { id: 'galbi', name: '왕갈비맛', packQuantity: 10, calories: '125', protein: '18', isNew: false, isBest: false, soldOut: false, image: 'galbi.webp' },
      { id: 'honey-soy', name: '허니소이맛', packQuantity: 10, calories: '125', protein: '18', isNew: false, isBest: false, soldOut: false, image: 'honey-soy.webp' },
      { id: 'black-garlic', name: '블랙갈릭맛', packQuantity: 10, calories: '125', protein: '18', isNew: false, isBest: false, soldOut: false, image: 'black-garlic.webp' },
    ],

    // Cafe24에서 추론할 수 없는 마케팅 배지만 개입수별로 지정한다.
    // 가격, 개당 가격과 할인율은 원본 옵션에서 자동 계산하고 배지만 여기서 지정한다.
    bundleMeta: {
      30: { badge: '가장 많이 사요', badgeTone: 'accent' },
      100: { badge: '최대할인', badgeTone: 'danger' },
    },

    // 내부 이벤트명: 외부 연동 코드가 없는 경우 수정하지 않는다.
    events: {
      configReady: 'pick-options:config-ready',
      ready: 'pick-options:ready',
      selectionChange: 'pick-options:selection-change',
      limitReached: 'pick-options:limit-reached',
    },
  };

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.getOwnPropertyNames(value).forEach(function freezeProperty(key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  window.PICK_OPTIONS_CONFIG = deepFreeze(config);
  window.dispatchEvent(new CustomEvent(config.events.configReady, {
    detail: window.PICK_OPTIONS_CONFIG,
  }));
})(window);
