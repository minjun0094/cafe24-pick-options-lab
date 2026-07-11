/**
 * Cafe24 골라담기 설정
 *
 * 상품별로 달라지는 값과 DOM 탐색 규칙을 실행 코드에서 분리한다.
 * 이 파일을 pick-options.js보다 먼저 불러와야 한다.
 */
(function registerPickOptionsConfig(window) {
  'use strict';

  const config = {
    version: 1,

    target: {
      productNos: ['11'],
      productNoQueryKey: 'product_no',
    },

    selectors: {
      productDetail: '.xans-product-detail',
      optionTable: 'table.xans-product-option',
      optionList: '.ec-product-button[product_type="product_option"]',
      optionItem: 'li[option_value]',
      optionSelect: 'select[name^="option"]',
      totalProducts: '#totalProducts',
      totalProductsBody: '#totalProducts tbody',
      totalPrice: '#totalPrice',
    },

    ui: {
      heading: '구성을 선택해 주세요',
      description: '원하는 수량과 구성을 선택하면 상품 목록에 바로 추가됩니다.',
      quantitySuffix: '개입',
      variantPrefix: '구성',
      unavailableText: '품절',
    },

    option: {
      title: '구성',
      valueAttribute: 'option_value',
      emptyValues: ['', '*', '**'],
      selectedClass: 'ec-product-selected',
      unavailableClasses: ['ec-product-disabled', 'ec-product-soldout'],
      // 예: "30개입_2 (+5,000원)" -> quantity: 30, variant: 2
      labelPattern: /^(\d+)개입_(\d+)(?:\s*\([^)]*\))?$/,
    },

    bundles: [
      {
        quantity: 10,
        options: [
          { variant: 1, value: 'P000000L000A' },
          { variant: 2, value: 'P000000L000B' },
        ],
      },
      {
        quantity: 30,
        options: [
          { variant: 1, value: 'P000000L000C' },
          { variant: 2, value: 'P000000L000D' },
        ],
      },
      {
        quantity: 50,
        options: [
          { variant: 1, value: 'P000000L000E' },
          { variant: 2, value: 'P000000L000F' },
        ],
      },
      {
        quantity: 100,
        options: [
          { variant: 1, value: 'P000000L000G' },
          { variant: 2, value: 'P000000L000H' },
        ],
      },
    ],

    events: {
      configReady: 'pick-options:config-ready',
      ready: 'pick-options:ready',
      selectionChange: 'pick-options:selection-change',
    },
  };

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }

    Object.getOwnPropertyNames(value).forEach(function freezeProperty(property) {
      deepFreeze(value[property]);
    });

    return Object.freeze(value);
  }

  window.PICK_OPTIONS_CONFIG = deepFreeze(config);

  window.dispatchEvent(
    new CustomEvent(config.events.configReady, {
      detail: window.PICK_OPTIONS_CONFIG,
    }),
  );
})(window);
