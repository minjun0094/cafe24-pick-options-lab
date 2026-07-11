/**
 * Cafe24 골라담기 UI 설정
 *
 * 옵션값, 노출 가격, 뱃지와 설명은 이 파일에서만 관리한다.
 * options 배열의 순서가 동일 개입수의 추가 순서(_1, _2, ...)다.
 */
(function registerPickOptionsConfig(window) {
  'use strict';

  const config = {
    version: 3,
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
      selectedProduct: '#totalProducts tr.option_product',
      selectedItemCode: 'input.option_box_id[name="item_code[]"]',
    },
    option: {
      valueAttribute: 'option_value',
      emptyValues: ['', '*', '**'],
      selectedClass: 'ec-product-selected',
      unavailableClasses: ['ec-product-disabled', 'ec-product-soldout'],
      labelPattern: /^(\d+)개입_(\d+)(?:\s*\([^)]*\))?$/,
    },
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
      flavorDescription: '10개입 단위로 원하는 맛을 골라 주세요.',
      flavorUnitLabel: '10개입',
      selectedTotalTemplate: '총 {current}개 / {target}개',
      completeLabel: '선택 완료',
      cancelLabel: '취소',
      decreaseLabel: '수량 빼기',
      increaseLabel: '수량 더하기',
      imageAltSuffix: ' 상품 이미지',
      selectionSummaryLabel: '선택한 맛',
    },
    flavorUnitQuantity: 10,
    // image가 비어 있으면 플레이스홀더가 표시된다.
    // Cafe24에 이미지를 올린 뒤 image 값만 /web/upload/... URL로 교체한다.
    flavors: [
      { id: 'tteokbokki', name: '떡볶이맛', image: '' },
      { id: 'butter-chicken', name: '버터치킨커리맛', image: '' },
      { id: 'hot-seasoned', name: '핫양념치킨맛', image: '' },
      { id: 'chipotle-mayo', name: '치폴레마요맛', image: '' },
      { id: 'sweet-onion', name: '스위트어니언맛', image: '' },
      { id: 'galbi', name: '왕갈비맛', image: '' },
      { id: 'honey-soy', name: '허니소이맛', image: '' },
      { id: 'black-garlic', name: '블랙갈릭맛', image: '' },
    ],
    bundles: [
      {
        quantity: 10,
        label: '10개입',
        price: 10000,
        unitPrice: 1000,
        badge: '',
        badgeTone: 'accent',
        priceNote: '기본가',
        options: [
          { suffix: 1, value: 'P000000L000A' },
          { suffix: 2, value: 'P000000L000B' },
        ],
      },
      {
        quantity: 30,
        label: '30개입',
        price: 15000,
        unitPrice: 500,
        badge: '가장 많이 사요',
        badgeTone: 'accent',
        priceNote: '+5,000원',
        options: [
          { suffix: 1, value: 'P000000L000C' },
          { suffix: 2, value: 'P000000L000D' },
        ],
      },
      {
        quantity: 50,
        label: '50개입',
        price: 20000,
        unitPrice: 400,
        badge: '',
        badgeTone: 'accent',
        priceNote: '+10,000원',
        options: [
          { suffix: 1, value: 'P000000L000E' },
          { suffix: 2, value: 'P000000L000F' },
        ],
      },
      {
        quantity: 100,
        label: '100개입',
        price: 30000,
        unitPrice: 300,
        badge: '최대할인',
        badgeTone: 'danger',
        priceNote: '+20,000원',
        options: [
          { suffix: 1, value: 'P000000L000G' },
          { suffix: 2, value: 'P000000L000H' },
        ],
      },
    ],
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
