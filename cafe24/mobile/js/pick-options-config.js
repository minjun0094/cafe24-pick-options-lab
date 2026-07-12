/**
 * Cafe24 골라담기 UI 설정
 *
 * 옵션값, 노출 가격, 뱃지와 설명은 이 파일에서만 관리한다.
 * options 배열의 순서가 동일 개입수의 추가 순서(_1, _2, ...)다.
 *
 * 일반 수정: ui, flavors, bundles
 * 연동 수정: target, selectors, option, events
 */
(function registerPickOptionsConfig(window) {
  'use strict';

  const config = {
    version: 3,

    // Cafe24 연동 영역: 상품이나 스킨 DOM 구조가 바뀔 때만 수정한다.
    target: {
      productNos: ['11'],
      productNoQueryKey: 'product_no',
    },
    selectors: {
      optionTable: 'table.xans-product-option',
      optionList: '.ec-product-button[product_type="product_option"]',
      optionItem: 'li[option_value]',
      optionSelect: 'select[name^="option"]',
      totalProducts: '#totalProducts',
      totalPrice: '#totalPrice',
      deliveryPrice: '.delv_price_B',
      selectedProduct: '#totalProducts tr.option_product',
      selectedItemCode: 'input.option_box_id[name="item_code[]"]',
      purchaseButton: '#actionCart, #actionCartClone, .xans-product-action .ec-base-button.gColumn a.btnStrong, #orderFixArea .ec-base-button.gColumn a.btnStrong',
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

    // 일반 수정 영역: 맛별 표시 정보와 선택 가능 상태를 관리한다.
    // image가 비어 있으면 플레이스홀더가 표시된다.
    // Cafe24에 이미지를 올린 뒤 image 값만 /web/upload/... URL로 교체한다.
    // calories/protein은 숫자만 입력한다. 빈 값이면 화면에 표시하지 않는다.
    // isNew/isBest는 상태 라벨, soldOut: true이면 수량 선택 영역을 비활성화한다.
    flavors: [
      { id: 'tteokbokki', name: '떡볶이맛', packQuantity: 10, calories: '130', protein: '18', isNew: true, isBest: false, soldOut: false, image: 'https://ecimg.cafe24img.com/pg3139b63113993048/minjun077/web/egnis/flavors/tteokbokki.png' },
      { id: 'butter-chicken', name: '버터치킨커리맛', packQuantity: 10, calories: '105', protein: '18', isNew: false, isBest: false, soldOut: true, image: 'https://ecimg.cafe24img.com/pg3139b63113993048/minjun077/web/egnis/flavors/butter-chicken.png' },
      { id: 'hot-seasoned', name: '핫양념치킨맛', packQuantity: 10, calories: '125', protein: '18', isNew: false, isBest: false, soldOut: false, image: 'https://ecimg.cafe24img.com/pg3139b63113993048/minjun077/web/egnis/flavors/hot-seasoned.png' },
      { id: 'chipotle-mayo', name: '치폴레마요맛', packQuantity: 10, calories: '125', protein: '18', isNew: false, isBest: false, soldOut: false, image: 'https://ecimg.cafe24img.com/pg3139b63113993048/minjun077/web/egnis/flavors/chipotle-mayo.png' },
      { id: 'sweet-onion', name: '스위트어니언맛', packQuantity: 10, calories: '125', protein: '18', isNew: false, isBest: false, soldOut: false, image: 'https://ecimg.cafe24img.com/pg3139b63113993048/minjun077/web/egnis/flavors/sweet-onion.png' },
      { id: 'galbi', name: '왕갈비맛', packQuantity: 10, calories: '125', protein: '18', isNew: false, isBest: false, soldOut: false, image: 'https://ecimg.cafe24img.com/pg3139b63113993048/minjun077/web/egnis/flavors/galbi.png' },
      { id: 'honey-soy', name: '허니소이맛', packQuantity: 10, calories: '125', protein: '18', isNew: false, isBest: false, soldOut: false, image: 'https://ecimg.cafe24img.com/pg3139b63113993048/minjun077/web/egnis/flavors/honey-soy.png' },
      { id: 'black-garlic', name: '블랙갈릭맛', packQuantity: 10, calories: '125', protein: '18', isNew: false, isBest: false, soldOut: false, image: 'https://ecimg.cafe24img.com/pg3139b63113993048/minjun077/web/egnis/flavors/black-garlic.png' },
    ],

    // 일반 수정 영역: 개입수별 가격, 문구, suffix 순서를 관리한다.
    bundles: [
      {
        quantity: 10,
        label: '10개입',
        price: 24700,
        unitPrice: 2470,
        badge: '',
        badgeTone: 'accent',
        priceNote: '(25% 할인)',
        options: [
          { suffix: 1, value: 'P000000L000A' },
          { suffix: 2, value: 'P000000L000B' },
        ],
      },
      {
        quantity: 30,
        label: '30개입',
        price: 70500,
        unitPrice: 2350,
        badge: '가장 많이 사요',
        badgeTone: 'accent',
        priceNote: '(29% 할인)',
        options: [
          { suffix: 1, value: 'P000000L000C' },
          { suffix: 2, value: 'P000000L000D' },
        ],
      },
      {
        quantity: 50,
        label: '50개입',
        price: 111500,
        unitPrice: 2230,
        badge: '',
        badgeTone: 'accent',
        priceNote: '(32% 할인)',
        options: [
          { suffix: 1, value: 'P000000L000E' },
          { suffix: 2, value: 'P000000L000F' },
        ],
      },
      {
        quantity: 100,
        label: '100개입',
        price: 196000,
        unitPrice: 1960,
        badge: '최대할인',
        badgeTone: 'danger',
        priceNote: '(41% 할인)',
        options: [
          { suffix: 1, value: 'P000000L000G' },
          { suffix: 2, value: 'P000000L000H' },
        ],
      },
    ],

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
